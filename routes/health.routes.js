const express = require('express');
const router = express.Router();
const { supabase } = require('../config/supabase');

/**
 * @route   GET /api/health
 * @desc    Health check endpoint
 * @access  Public
 */
router.get('/', async (req, res) => {
  try {
    // Check database connection
    const { error } = await supabase
      .from('profiles')
      .select('*')
      .limit(1)
      .single();

    if (error) {
      console.error('Health check failed - Database connection error:', error);
      return res.status(503).json({
        status: 'error',
        message: 'Database connection failed',
        error: error.message
      });
    }

    // If we get here, everything is working
    res.status(200).json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      database: 'connected',
      environment: process.env.NODE_ENV || 'development'
    });
  } catch (error) {
    console.error('Health check failed:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error during health check',
      error: error.message
    });
  }
});

module.exports = router;
