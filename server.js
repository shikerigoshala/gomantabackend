const path = require('path');
const fs = require('fs');
require('dotenv').config(); // Load .env file first as fallback

// Determine environment
const envPath = process.env.NODE_ENV === 'production' 
  ? path.join(__dirname, '../.env.production')
  : path.join(__dirname, '../.env');

// Check if the environment file exists and load it
if (fs.existsSync(envPath)) {
  require('dotenv').config({ path: envPath, override: true });
  console.log(`Loaded environment variables from ${envPath}`);
} else {
  console.warn(`Warning: Environment file not found at ${envPath}`);
}

// Verify required environment variables
const requiredVars = [
  'SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
  'JWT_SECRET',
  'FRONTEND_URL'
];

const missingVars = requiredVars.filter(varName => !process.env[varName]);

if (missingVars.length > 0) {
  console.error('\n❌ ERROR: Missing required environment variables:');
  missingVars.forEach(varName => console.error(`- ${varName}`));
  console.log('\nCurrent environment variables:', JSON.stringify(process.env, null, 2));
  process.exit(1);
}

// Enhanced environment variable logging (mask sensitive values)
console.log('\n=== Environment Configuration ===');
console.log(`NODE_ENV: ${process.env.NODE_ENV || 'development'}`);
console.log(`SUPABASE_URL: ${process.env.SUPABASE_URL ? '✅ Set' : '❌ Missing'}`);
console.log(`JWT_SECRET: ${process.env.JWT_SECRET ? '✅ Set' : '❌ Missing'}`);
console.log(`FRONTEND_URL: ${process.env.FRONTEND_URL || '❌ Missing'}`);
console.log('=================================\n');
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('Environment file loaded from:', envPath);
console.log('\nSupabase Configuration:');
console.log('- SUPABASE_URL:', process.env.SUPABASE_URL ? 'Set' : 'Not set');
console.log('- NEXT_PUBLIC_SUPABASE_URL:', process.env.NEXT_PUBLIC_SUPABASE_URL ? 'Set' : 'Not set');
console.log('- SUPABASE_KEY:', process.env.SUPABASE_KEY ? 'Set' : 'Not set');
console.log('- SUPABASE_ANON_KEY:', process.env.SUPABASE_ANON_KEY ? 'Set' : 'Not set');
console.log('- NEXT_PUBLIC_SUPABASE_ANON_KEY:', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'Set' : 'Not set');
console.log('- SUPABASE_SERVICE_ROLE_KEY:', process.env.SUPABASE_SERVICE_ROLE_KEY ? 'Set' : 'Not set');
console.log('- SERVICE_ROLE_KEY:', process.env.SERVICE_ROLE_KEY ? 'Set' : 'Not set');
console.log('\nServer Configuration:');
console.log('- PORT:', process.env.PORT || 3001);
console.log('==============================\n');

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
const allowedOrigins = [
  'https://donate.gomantakgausevak.com', // Production frontend
  'http://localhost:3000',               // Local development
  'http://127.0.0.1:3000',               // Local development alternative
  'http://localhost:3001',               // Local API
  'http://127.0.0.1:3001'                // Local API alternative
];

const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    // Check if the origin is in the allowed list
    if (allowedOrigins.includes(origin) || 
        process.env.NODE_ENV === 'development') {
      return callback(null, true);
    }
    
    // For production, only allow the production frontend
    if (process.env.NODE_ENV === 'production' && 
        origin === process.env.FRONTEND_URL) {
      return callback(null, true);
    }
    
    callback(new Error(`CORS not allowed for origin: ${origin}`));
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
