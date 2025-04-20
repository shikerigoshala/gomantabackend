require('dotenv').config();
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const path = require('path');
const authRoutes = require('./routes/auth');
const donationRoutes = require('./routes/donations');
const { authenticateToken } = require('./middleware/auth');

// Set JWT secret
process.env.JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

const app = express();

// Middleware
app.use(express.json());
app.use(cookieParser());

// Configure CORS
const corsOptions = {
  origin: process.env.NODE_ENV === 'production'
    ? ['https://donate.gomantakgausevak.com', 'https://www.donate.gomantakgausevak.com']
    : 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
};
app.use(cors(corsOptions));

// Handle preflight requests
app.options('*', cors(corsOptions));

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', environment: process.env.NODE_ENV });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/donations', donationRoutes);

// In production, serve the React frontend
if (process.env.NODE_ENV === 'production') {
  // Serve static files from the React build directory
  app.use(express.static(path.join(__dirname, '../build')));

  // For any route not handled by the API, serve the React app
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../build', 'index.html'));
  });

  console.log('Running in production mode, serving frontend files');
}

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
