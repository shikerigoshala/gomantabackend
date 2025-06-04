const path = require('path');
const fs = require('fs');
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

// Load environment variables as early as possible
console.log('Initializing environment...');

// Determine environment
const envPath = process.env.NODE_ENV === 'production' 
  ? path.join(__dirname, '.env.production')
  : path.join(__dirname, '.env');

// Check if the environment file exists
if (fs.existsSync(envPath)) {
  console.log(`Loading environment from: ${envPath}`);
  require('dotenv').config({ path: envPath, override: true });
} else {
  console.warn(`Warning: Environment file not found at ${envPath}`);
  // Fallback to default .env in parent directory
  const parentEnvPath = path.join(__dirname, '../.env');
  if (fs.existsSync(parentEnvPath)) {
    console.log(`Loading environment from: ${parentEnvPath}`);
    require('dotenv').config({ path: parentEnvPath, override: true });
  } else {
    console.warn('No environment files found. Using process.env only.');
  }
}

// Ensure NODE_ENV is set
process.env.NODE_ENV = process.env.NODE_ENV || 'development';

// Log important environment variables (without sensitive values)
console.log('Environment:');
console.log(`- NODE_ENV: ${process.env.NODE_ENV}`);
console.log(`- NODE_OPTIONS: ${process.env.NODE_OPTIONS || 'Not set'}`);
console.log(`- SUPABASE_URL: ${process.env.SUPABASE_URL ? 'Set' : 'Not set'}`);
console.log(`- NEXT_PUBLIC_SUPABASE_URL: ${process.env.NEXT_PUBLIC_SUPABASE_URL ? 'Set' : 'Not set'}`);
console.log(`- SUPABASE_ANON_KEY: ${process.env.SUPABASE_ANON_KEY ? 'Set' : 'Not set'} (length: ${process.env.SUPABASE_ANON_KEY?.length || 0})`);
console.log(`- SUPABASE_SERVICE_ROLE_KEY: ${process.env.SUPABASE_SERVICE_ROLE_KEY ? 'Set' : 'Not set'} (length: ${process.env.SUPABASE_SERVICE_ROLE_KEY?.length || 0})`);

// Ensure required environment variables are set
const requiredVars = [
  'SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_URL',
  'SUPABASE_ANON_KEY',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'SERVICE_ROLE_KEY',
  'JWT_SECRET'
];

const missingVars = requiredVars.filter(varName => !process.env[varName]);
if (missingVars.length > 0) {
  console.error('ERROR: Missing required environment variables:', missingVars.join(', '));
  console.error('Please check your .env file and ensure all required variables are set.');
  
  // In production, we want to fail fast if required variables are missing
  if (process.env.NODE_ENV === 'production') {
    process.exit(1);
  } else {
    console.warn('⚠️  Running in development mode with missing environment variables. Some features may not work.');
  }
}

// Import routes
const authRoutes = require('./routes/auth.routes');
const donationRoutes = require('./routes/donation.routes');
const profileRoutes = require('./routes/profile.routes');
const adminRoutes = require('./routes/admin.routes');
const healthRoutes = require('./routes/health.routes');

// Import middleware
const { authenticateToken } = require('./middleware/auth');

// Import Supabase service
const { testConnection } = require('./services/supabase.service');

// Test Supabase connection on startup
if (process.env.NODE_ENV !== 'test') {
  testConnection().then(success => {
    if (!success) {
      console.error('⚠️  Failed to connect to Supabase. Some features may not work.');
    }
  }).catch(error => {
    console.error('Error testing Supabase connection:', error);
  });
}

// Set JWT secret
process.env.JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

const app = express();

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'", 'https://*.supabase.co'],
      fontSrc: ["'self'", 'https: data:'],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: [],
    },
  },
  hsts: {
    maxAge: 31536000, // 1 year in seconds
    includeSubDomains: true,
    preload: true,
  },
  frameguard: {
    action: 'deny',
  },
  noSniff: true,
  xssFilter: true,
}));

// Gzip compression
app.use(compression());

// Configure CORS
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:3001',
  'https://donate.gomantakgausevak.com',
  'https://www.donate.gomantakgausevak.com',
  process.env.FRONTEND_URL
].filter(Boolean);

const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps, curl, etc.)
    if (!origin) return callback(null, true);
    
    // Check if origin is in allowed list or is a subdomain of allowed domains
    const isAllowed = allowedOrigins.some(allowedOrigin => 
      origin === allowedOrigin || 
      origin.endsWith('.' + new URL(allowedOrigin).hostname)
    );
    
    if (!isAllowed) {
      const msg = `The CORS policy for this site does not allow access from the specified Origin: ${origin}`;
      console.warn('CORS blocked request from:', origin);
      return callback(new Error(msg), false);
    }
    
    return callback(null, true);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: [
    'Content-Type', 
    'Authorization', 
    'x-api-key',
    'x-requested-with',
    'accept',
    'origin'
  ],
  exposedHeaders: [
    'Content-Range', 
    'X-Total-Count',
    'x-ratelimit-limit',
    'x-ratelimit-remaining',
    'x-ratelimit-reset'
  ],
  maxAge: 86400, // 24 hours
  preflightContinue: false,
  optionsSuccessStatus: 204
};

// Apply CORS with options
app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

// Body parsing middleware
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));
app.use(cookieParser());

// Rate limiting
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'production' ? 100 : 1000, // 100 requests per window in production, 1000 in development
  standardHeaders: true,
  legacyHeaders: false,
  message: { 
    status: 'error',
    message: 'Too many requests from this IP, please try again after 15 minutes' 
  }
});

// Apply rate limiting to API routes
app.use('/api/', apiLimiter);

// Logging middleware
if (process.env.NODE_ENV === 'production') {
  app.use(morgan('combined', {
    skip: (req) => req.path === '/health', // Skip health checks in production logs
    stream: process.stderr
  }));
} else {
  app.use(morgan('dev'));
}

// Request logging middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
  if (req.body && Object.keys(req.body).length > 0) {
    console.log('Request body:', JSON.stringify(req.body, null, 2));
  }
  next();
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', environment: process.env.NODE_ENV });
});

// API routes
app.use('/api/health', healthRoutes); // Health check endpoint
app.use('/api/auth', authRoutes);
app.use('/api/donations', donationRoutes);
app.use('/api/profiles', profileRoutes);
app.use('/api/admin', adminRoutes);

// 404 handler for API routes
app.use('/api/*', (req, res, next) => {
  const error = new Error(`Not Found - ${req.originalUrl}`);
  error.status = 404;
  next(error);
});

// Global error handler middleware
app.use((err, req, res, next) => {
  // Log the error
  console.error(`[${new Date().toISOString()}] Error: ${err.message}`);
  console.error(err.stack);
  
  // Set default status code if not set
  const statusCode = err.status || 500;
  
  // Prepare error response
  const errorResponse = {
    status: 'error',
    message: err.message || 'Internal Server Error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  };
  
  // Handle specific error types
  if (err.name === 'ValidationError') {
    errorResponse.message = 'Validation Error';
    errorResponse.errors = Object.values(err.errors).map(e => e.message);
  } else if (err.name === 'JsonWebTokenError') {
    errorResponse.message = 'Invalid token';
  } else if (err.name === 'TokenExpiredError') {
    errorResponse.message = 'Token expired';
  } else if (err.name === 'UnauthorizedError') {
    errorResponse.message = 'Unauthorized';
  }
  
  // Send error response
  res.status(statusCode).json(errorResponse);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error('UNHANDLED REJECTION! 💥 Shutting down...');
  console.error(err.name, err.message);
  
  // Close server and exit process
  server.close(() => {
    process.exit(1);
  });
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('UNCAUGHT EXCEPTION! 💥 Shutting down...');
  console.error(err.name, err.message);
  
  // Close server and exit process
  server.close(() => {
    process.exit(1);
  });
});

// Handle SIGTERM signal for graceful shutdown
process.on('SIGTERM', () => {
  console.log('👋 SIGTERM RECEIVED. Shutting down gracefully');
  server.close(() => {
    console.log('💥 Process terminated!');
  });
});

// Serve static files and handle client-side routing
const serveStatic = (app, buildDir) => {
  // Serve static files
  app.use(express.static(buildDir, {
    index: false, // Don't serve index.html for directories
    setHeaders: (res, path) => {
      // Set long cache for static assets
      if (path.endsWith('.js') || path.endsWith('.css') || path.endsWith('.png') || path.endsWith('.jpg') || path.endsWith('.jpeg') || path.endsWith('.gif') || path.endsWith('.svg') || path.endsWith('.woff') || path.endsWith('.woff2') || path.endsWith('.ttf') || path.endsWith('.eot')) {
        res.setHeader('Cache-Control', 'public, max-age=31536000');
      }
    }
  }));

  // Handle client-side routing - return index.html for all non-API routes
  app.get('*', (req, res, next) => {
    // Skip API routes
    if (req.path.startsWith('/api/')) {
      return next();
    }
    
    const indexPath = path.join(buildDir, 'index.html');
    if (require('fs').existsSync(indexPath)) {
      res.sendFile(indexPath);
    } else {
      next();
    }
  });
};

// In production, configure CORS for cPanel frontend
if (process.env.NODE_ENV === 'production') {
  console.log('Running in production mode - API only');
  
  // Configure CORS for production - Only allow requests from ResellerClub domain
  const corsOptions = {
    origin: [
      'https://donate.gomantakgausevak.com',
      'https://www.donate.gomantakgausevak.com'
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
    exposedHeaders: ['Content-Length', 'X-Foo', 'X-Bar']
  };
  
  console.log('Production CORS configuration:', {
    allowedOrigins: corsOptions.origin,
    methods: corsOptions.methods,
    allowedHeaders: corsOptions.allowedHeaders
  });
  
  // Apply CORS to all routes
  app.use(cors(corsOptions));
  app.options('*', cors(corsOptions));
  
  // Simple root route to indicate API is running
  app.get('/', (req, res) => {
    res.json({
      status: 'API is running',
      environment: process.env.NODE_ENV,
      timestamp: new Date().toISOString()
    });
  });
}

// Create HTTP server
const PORT = process.env.PORT || 3001;
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n🚀 Server is running on port ${PORT}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV}`);
  console.log(`🔗 Frontend URL: ${process.env.FRONTEND_URL || 'Not set'}`);
  console.log(`🔌 Supabase URL: ${process.env.SUPABASE_URL ? 'Configured' : 'Not configured'}`);
  
  // Log database connection status
  console.log('\n📊 Database connection status:');
  if (process.env.SUPABASE_URL) {
    console.log('   ✅ Supabase connection configured');
  } else {
    console.warn('   ⚠️  Supabase URL not configured');
  }
  
  // Log API routes
  console.log('\n🛣️  Available API Routes:');
  console.log(`   - POST   /api/auth/register/family`);
  console.log(`   - POST   /api/auth/login`);
  console.log(`   - GET    /api/health`);
  console.log(`   - GET    /api/donations`);
  console.log(`   - POST   /api/donations`);
  console.log(`   - GET    /api/profiles`);
  console.log(`   - GET    /api/profiles/:id`);
  
  console.log('\n🔒 Authentication required for protected routes');
  console.log('🔍 Use x-api-key header for API key authentication\n');
});

// Handle server errors
server.on('error', (error) => {
  if (error.syscall !== 'listen') {
    throw error;
  }

  const bind = typeof PORT === 'string' ? 'Pipe ' + PORT : 'Port ' + PORT;

  // Handle specific listen errors with friendly messages
  switch (error.code) {
    case 'EACCES':
      console.error('❌ ' + bind + ' requires elevated privileges');
      process.exit(1);
      break;
    case 'EADDRINUSE':
      console.error('❌ ' + bind + ' is already in use');
      process.exit(1);
      break;
    default:
      throw error;
  }
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error('\n❌ UNHANDLED REJECTION! Shutting down...');
  console.error(err.name, err.message);
  
  // Close server and exit process
  server.close(() => {
    process.exit(1);
  });
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('\n❌ UNCAUGHT EXCEPTION! Shutting down...');
  console.error(err.name, err.message);
  
  // Close server and exit process
  server.close(() => {
    process.exit(1);
  });
});

// Handle SIGTERM signal for graceful shutdown
process.on('SIGTERM', () => {
  console.log('\n👋 SIGTERM RECEIVED. Shutting down gracefully');
  server.close(() => {
    console.log('💥 Process terminated!');
    process.exit(0);
  });
});

// Handle process exit
process.on('exit', (code) => {
  console.log(`\n🚪 Process exiting with code ${code}`);
  if (server) {
    server.close();
  }
});

// Export the server for testing
module.exports = server;
