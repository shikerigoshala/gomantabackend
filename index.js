const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const donationRoutes = require('./routes/donations');
const authRoutes = require('./routes/auth');

// Load environment variables from .env file in the project root
dotenv.config({ path: path.join(__dirname, '../.env') });

const app = express();

// Enable CORS for different environments (production or development)
app.use(cors({
  origin: process.env.NODE_ENV === 'production'
    ? 'https://donate.gomantakgausevak.com'  // Production URL
    : 'http://localhost:3000',  // Local URL for development
  credentials: true  // Allow credentials (cookies, etc.)
}));

// Parse incoming JSON request bodies
app.use(express.json());

// Define API routes for donations
app.use('https://gomantabackend.onrender.com/api/donations', donationRoutes);

// Define API routes for authentication
app.use('/api/auth', authRoutes);

// Health check endpoint to check if the server is running
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Error handling middleware for server errors
app.use((err, req, res, next) => {
  console.error('Error:', err);  // Log the error for debugging
  res.status(500).json({
    message: err.message || 'Internal server error',  // Send the error message
    error: process.env.NODE_ENV === 'development' ? err : undefined  // Show full error details only in development mode
  });
});

// Listen on the specified port (default 3001)
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
