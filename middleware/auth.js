const jwt = require('jsonwebtoken');

const authenticateToken = (req, res, next) => {
  try {
    // Skip authentication for registration and login routes
    if (
      req.path === '/api/auth/register/family' || 
      req.path === '/api/auth/login' ||
      req.path === '/api/auth/register'
    ) {
      return next();
    }

    console.log('Auth headers:', req.headers);

    // Check for token in Authorization header
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

    if (!token) {
      console.log('No token provided');
      return res.status(401).json({ 
        success: false,
        message: 'Authentication required' 
      });
    }

    if (!process.env.JWT_SECRET) {
      console.error('JWT_SECRET is not set');
      return res.status(500).json({
        success: false,
        message: 'Server configuration error'
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log('Decoded token:', decoded);

    req.user = decoded;
    next();
  } catch (error) {
    console.error('Authentication error:', error);
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Session expired. Please log in again.',
        code: 'TOKEN_EXPIRED'
      });
    }

    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token',
        code: 'INVALID_TOKEN'
      });
    }

    return res.status(401).json({
      success: false,
      message: 'Authentication failed',
      error: error.message,
      code: 'AUTH_ERROR'
    });
  }
};

module.exports = { authenticateToken };
