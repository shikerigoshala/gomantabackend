// Import dependencies
const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const cookieParser = require('cookie-parser');

// Load environment variables with priority:
// 1. Platform environment variables (highest priority)
// 2. .env.production (for production)
// 3. .env (for development, lowest priority)
console.log('Initializing environment...');

// Load default .env first if it exists
const envPath = path.join(__dirname, '../.env');
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
  console.log('Loaded environment variables from .env');
}

// In production, override with .env.production if it exists
if (process.env.NODE_ENV === 'production') {
  const prodEnvPath = path.join(__dirname, '../.env.production');
  if (fs.existsSync(prodEnvPath)) {
    dotenv.config({ path: prodEnvPath, override: true });
    console.log('Loaded environment variables from .env.production');
  } else {
    console.warn('⚠️ Production environment file (.env.production) not found');
  }
}

// Ensure NODE_ENV is set
process.env.NODE_ENV = process.env.NODE_ENV || 'development';

// Create Express app
const app = express();

// Import routes
const healthRoutes = require('./routes/health.routes');
const authRoutes = require('./routes/auth.routes');
const donationRoutes = require('./routes/donation.routes');
const profileRoutes = require('./routes/profile.routes');
const adminRoutes = require('./routes/admin.routes');

// Import Supabase service
const { testConnection } = require('./config/supabase');

// Log environment status
console.log('\n=== Environment Status ===');
console.log(`Node Environment: ${process.env.NODE_ENV}`);
console.log(`PORT: ${process.env.PORT || 3001}`);
console.log(`SUPABASE_URL: ${process.env.SUPABASE_URL ? '✅ Set' : '❌ Missing'}`);
console.log(`SUPABASE_ANON_KEY: ${process.env.SUPABASE_ANON_KEY ? '✅ Set' : '❌ Missing'}`);
console.log(`SUPABASE_SERVICE_ROLE_KEY: ${process.env.SUPABASE_SERVICE_ROLE_KEY ? '✅ Set' : '❌ Missing'}`);
console.log(`JWT_SECRET: ${process.env.JWT_SECRET ? '✅ Set' : '❌ Missing'}`);
console.log(`FRONTEND_URL: ${process.env.FRONTEND_URL || '❌ Missing'}`);
console.log('==========================\n');

// Verify required environment variables
const requiredVars = [
  'SUPABASE_URL',
  'SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'JWT_SECRET',
  'FRONTEND_URL'
];

// Set a secure JWT_SECRET if not provided
if (!process.env.JWT_SECRET) {
  if (process.env.NODE_ENV === 'production') {
    console.error('❌ FATAL: JWT_SECRET is required in production');
    process.exit(1);
  } else {
    console.warn('⚠️ WARNING: JWT_SECRET not set. Using a development secret.');
    process.env.JWT_SECRET = 'dev-secret-' + Math.random().toString(36).substring(2);
  }
}

const missingVars = requiredVars.filter(varName => !process.env[varName]);

if (missingVars.length > 0) {
  console.error('\n❌ ERROR: Missing required environment variables:');
  missingVars.forEach(varName => console.error(`- ${varName}`));
  console.log('\nCurrent environment variables:', JSON.stringify({
    NODE_ENV: process.env.NODE_ENV,
    PORT: process.env.PORT,
    SUPABASE_URL: process.env.SUPABASE_URL ? '✅ Set' : '❌ Missing',
    FRONTEND_URL: process.env.FRONTEND_URL || '❌ Missing',
    JWT_SECRET: process.env.JWT_SECRET ? '✅ Set' + (process.env.JWT_SECRET.startsWith('default-') ? ' (using default)' : '') : '❌ Missing',
  }, null, 2));
  
  if (process.env.NODE_ENV === 'production') {
    console.error('\n❌ FATAL: Cannot start in production with missing required variables');
    process.exit(1);
  } else {
    console.warn('\n⚠️  WARNING: Starting in development mode with missing variables');
  }
}

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

// Routes
app.use('/api/health', healthRoutes);
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

// Basic middleware
app.use(express.json());
app.use(cookieParser());

// Configure CORS
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:3001',
  'https://donate.gomantakgausevak.com',
  'https://www.donate.gomantakgausevak.com',
  'https://gomantabackend.onrender.com',
  process.env.FRONTEND_URL
].filter(Boolean);

console.log('🔄 Allowed CORS origins:', allowedOrigins);

const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) {
      console.log('🔓 No origin (non-browser request) - allowing');
      return callback(null, true);
    }
    
    try {
      const originUrl = new URL(origin);
      const isAllowed = allowedOrigins.some(allowedOrigin => {
        try {
          const allowedUrl = new URL(allowedOrigin);
          return (
            origin === allowedOrigin ||
            originUrl.hostname === allowedUrl.hostname ||
            originUrl.hostname.endsWith('.' + allowedUrl.hostname) ||
            (process.env.NODE_ENV !== 'production' && allowedUrl.hostname === 'localhost')
          );
        } catch (e) {
          console.warn(`Error parsing allowed origin ${allowedOrigin}:`, e);
          return false;
        }
      });

      if (isAllowed) {
        console.log(`✅ Allowed CORS request from: ${origin}`);
        return callback(null, true);
      }
      
      console.warn(`🚫 CORS blocked request from: ${origin}`);
      console.log('🔄 Allowed origins:', allowedOrigins);
      return callback(new Error(`Not allowed by CORS: ${origin}`), false);
      
    } catch (e) {
      console.error('Error processing CORS origin:', e);
      return callback(e, false);
    }
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

// Apply CORS middleware
console.log('🔐 Applying CORS middleware...');
app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

// Body parsing middleware
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));
app.use(cookieParser());

// Rate limiting
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'production' ? 100 : 1000,
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
    skip: (req) => req.path === '/health',
    stream: process.stderr
  }));
} else {
  app.use(morgan('dev'));
}

// Request logging middleware
app.use((req, res, next) => {
  console.log(`\n🌐 ${new Date().toISOString()} ${req.method} ${req.originalUrl}`);
  console.log('📝 Headers:', {
    origin: req.headers.origin,
    'x-api-key': req.headers['x-api-key'] ? '***' + req.headers['x-api-key'].slice(-4) : 'Not provided',
    'content-type': req.headers['content-type']
  });
  if (req.body && Object.keys(req.body).length > 0) {
    console.log('Request body:', JSON.stringify(req.body, null, 2));
  }
  next();
});

// Log CORS errors
app.use((err, req, res, next) => {
  if (err.message.includes('CORS')) {
    console.error('CORS Error:', err.message);
    return res.status(403).json({
      success: false,
      message: 'CORS Error: Not allowed by CORS',
      details: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
  next(err);
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', environment: process.env.NODE_ENV });
});

// API routes
app.use('/api/health', healthRoutes);
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
  console.error('UNHANDLED REJECTION! Shutting down...');
  console.error(err.name, err.message);
  
  // Close server and exit process
  server.close(() => {
    process.exit(1);
  });
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('UNCAUGHT EXCEPTION! Shutting down...');
  console.error(err.name, err.message);
  
  // Close server and exit process
  server.close(() => {
    process.exit(1);
  });
});

// Handle SIGTERM signal for graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM RECEIVED. Shutting down gracefully');
});

// Start the server
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

// Export the server for testing
module.exports = server;

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

  // Serve static files from the build/public directory
  app.use(express.static(path.join(__dirname, '../build/public'), {
    index: false, // Don't serve index.html for directories
    maxAge: '1y', // Cache static assets for 1 year
  }));

  // For any other GET request, serve the React app
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../build/public/index.html'));
  });

  console.log('Running in production mode, serving frontend files from build/public');
} else {
  // In development, just log 404 for API routes
  app.use('/api', (req, res) => {
    res.status(404).json({ 
      success: false, 
      message: 'API endpoint not found' 
    });
  });
}
