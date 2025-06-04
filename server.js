const path = require('path');
const fs = require('fs');

// Load environment variables with priority:
// 1. Platform environment variables (highest priority)
// 2. .env.production (for production)
// 3. .env (for development, lowest priority)

// Load default .env first if it exists
const envPath = path.join(__dirname, '../.env');
if (fs.existsSync(envPath)) {
  require('dotenv').config({ path: envPath });
  console.log('Loaded environment variables from .env');
}

// Then load production environment variables if in production
if (process.env.NODE_ENV === 'production') {
  const prodEnvPath = path.join(__dirname, '../.env.production');
  if (fs.existsSync(prodEnvPath)) {
    require('dotenv').config({ path: prodEnvPath, override: true });
    console.log('Loaded environment variables from .env.production');
  } else {
    console.warn('⚠️ Production environment file (.env.production) not found');
  }
}

// Log environment status
console.log('\n=== Environment Status ===');
console.log(`Node Environment: ${process.env.NODE_ENV || 'development'}`);
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
  'SUPABASE_SERVICE_ROLE_KEY',
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
    // Don't log sensitive values
  }, null, 2));
  
  if (process.env.NODE_ENV === 'production') {
    console.error('\n❌ FATAL: Cannot start in production with missing required variables');
    process.exit(1);
  } else {
    console.warn('\n⚠️  WARNING: Starting in development mode with missing variables');
  }
}

// Enhanced environment variable logging (mask sensitive values)
console.log('\n=== Environment Configuration ===');
console.log(`NODE_ENV: ${process.env.NODE_ENV || 'development'}`);
console.log(`PORT: ${process.env.PORT || 3001}`);
console.log(`SUPABASE_URL: ${process.env.SUPABASE_URL ? '✅ Set' : '❌ Missing'}`);
console.log(`JWT_SECRET: ${process.env.JWT_SECRET ? '✅ Set' : '❌ Missing'}`);
console.log(`FRONTEND_URL: ${process.env.FRONTEND_URL || '❌ Missing'}`);
console.log('\nSupabase Configuration:');
console.log(`- SUPABASE_URL: ${process.env.SUPABASE_URL ? '✅ Set' : '❌ Missing'}`);
console.log(`- SUPABASE_SERVICE_ROLE_KEY: ${process.env.SUPABASE_SERVICE_ROLE_KEY ? '✅ Set' : '❌ Missing'}`);
console.log('=================================\n');

const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const authRoutes = require('./routes/auth');
const donationRoutes = require('./routes/donations');
require('./middleware/auth');

// Set JWT secret
process.env.JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

const app = express();

// Middleware
app.use(express.json());
app.use(cookieParser());

// Configure CORS
const corsOptions = {
  origin: function (origin, callback) {
    // Allow all origins in development
    if (process.env.NODE_ENV !== 'production') {
      return callback(null, true);
    }
    
    // List of allowed origins in production
    const allowedOrigins = [
      'https://donate.gomantakgausevak.com',
      'https://www.donate.gomantakgausevak.com',
      process.env.FRONTEND_URL
    ].filter(Boolean);
    
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    // Check if the origin is in the allowed list
    if (allowedOrigins.some(allowedOrigin => 
      origin === allowedOrigin || 
      origin.startsWith(allowedOrigin.replace('https://', 'http://'))
    )) {
      return callback(null, true);
    }
    
    console.warn(`CORS blocked for origin: ${origin}`);
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: [
    'Content-Type', 
    'Authorization', 
    'X-Requested-With',
    'Accept',
    'Origin',
    'X-Auth-Token',
    'X-API-Key'
  ],
  exposedHeaders: [
    'Content-Range',
    'X-Total-Count',
    'Link'
  ],
  maxAge: 86400, // 24 hours
  preflightContinue: false,
  optionsSuccessStatus: 204
};

// Enable CORS for all routes
app.use(cors(corsOptions));

// Handle preflight requests
app.options('*', cors(corsOptions));

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

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/donations', donationRoutes);

// In production, serve the React frontend
if (process.env.NODE_ENV === 'production') {
  // Serve static files from the build/public directory
  app.use(express.static(path.join(__dirname, '../build/public'), {
    index: false, // Don't serve index.html for directories
    maxAge: '1y', // Cache static assets for 1 year
  }));

  // API routes should be defined before the catch-all route
  app.use('/api', (req, res, next) => {
    // If we get here, the API route wasn't found
    res.status(404).json({ 
      success: false, 
      message: 'API endpoint not found' 
    });
  });

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

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
