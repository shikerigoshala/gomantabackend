const express = require('express');
const jwt = require('jsonwebtoken');
const router = express.Router();
const { userService } = require('../services/supabase.service');
const { sendWelcomeEmail } = require('../services/emailService');

// Base register endpoint (for backward compatibility)
router.post('/register', (req, res, next) => {
  // Forward to /register/family by default
  req.url = '/register/family';
  next();
});

// Middleware to validate API key
const validateApiKey = (req, res, next) => {
  console.log('\n🔑 ========== API Key Validation ==========');
  
  // Get API key from environment variable - use Supabase anon key as the API key
  const validApiKey = process.env.SUPABASE_ANON_KEY;
  const isDev = process.env.NODE_ENV === 'development';
  
  // In development, allow a test key
  if (isDev && !validApiKey) {
    console.log('⚠️ Development mode: Using test API key');
    if (req.headers['x-api-key'] === 'test-api-key-dev') {
      console.log('✅ Test API key accepted');
      return next();
    }
  }
  
  if (!validApiKey) {
    console.error('❌ No API key configured in environment variables');
    return res.status(500).json({
      success: false,
      message: 'Server configuration error: API_KEY not set',
      code: 'server_error'
    });
  }
  
  // Try both header cases for maximum compatibility
  const apiKey = req.headers['x-api-key'] || req.headers['X-API-Key'];
  
  // Log request details for debugging (but don't log the full keys)
  const logSafeKey = (key) => {
    if (!key || typeof key !== 'string') return 'invalid-key';
    const length = key.length;
    if (length <= 8) return '***';
    return `${key.substring(0, 5)}...${key.substring(length - 3)} (${length} chars)`;
  };
  
  console.log('🔍 Request details:', {
    method: req.method,
    path: req.path,
    receivedKey: logSafeKey(apiKey),
    expectedKeyLength: validApiKey ? validApiKey.length : 0,
    headers: Object.keys(req.headers)
      .filter(h => !h.toLowerCase().includes('key') && !h.toLowerCase().includes('auth'))
      .join(', ')
  });

  // Log environment for debugging
  console.log('🌍 Environment:', {
    NODE_ENV: process.env.NODE_ENV,
    API_KEY_SET: !!validApiKey,
    API_KEY_LENGTH: validApiKey ? validApiKey.length : 0
  });

  // Validate the API key
  if (!apiKey) {
    console.error('❌ No API key provided in request');
    return res.status(401).json({ 
      success: false, 
      message: 'API key is required',
      code: 'missing_api_key',
      details: 'Please include x-api-key in your request headers'
    });
  }

  if (apiKey !== validApiKey) {
    console.error('❌ Invalid API key provided');
    return res.status(401).json({ 
      success: false, 
      message: 'Invalid API key',
      code: 'invalid_api_key',
      details: 'The provided API key is not valid'
    });
  }
  
  console.log('✅ API key validation successful');
  next();
};

// Register family user
router.post('/register/family', validateApiKey, async (req, res) => {
  try {
    console.log('Register family request received:', req.body);
    
    const { firstName, lastName, email, phone, password } = req.body;

    // Validate required fields
    if (!email || !password || !firstName || !lastName || !phone) {
      return res.status(400).json({ 
        success: false,
        message: 'All fields are required',
        errors: {
          ...(!email && { email: 'Email is required' }),
          ...(!password && { password: 'Password is required' }),
          ...(!firstName && { firstName: 'First name is required' }),
          ...(!lastName && { lastName: 'Last name is required' }),
          ...(!phone && { phone: 'Phone number is required' })
        }
      });
    }

    // Trim and validate input
    const trimmedEmail = (email || '').trim().toLowerCase();
    const trimmedPhone = (phone || '').trim();
    const trimmedFirstName = (firstName || '').trim();
    const trimmedLastName = (lastName || '').trim();

    // Email validation
    const emailRegex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,6}$/;
    const errors = {};
    
    if (!trimmedEmail) {
      errors.email = 'Email address is required';
    } else if (!emailRegex.test(trimmedEmail)) {
      errors.email = 'Please enter a valid email address';
    }

    // Phone validation (basic)
    if (!trimmedPhone) {
      errors.phone = 'Phone number is required';
    } else if (trimmedPhone.length < 10) {
      errors.phone = 'Phone number must be at least 10 digits';
    }

    // Name validation
    if (!trimmedFirstName) {
      errors.firstName = 'First name is required';
    } else if (trimmedFirstName.length < 2) {
      errors.firstName = 'First name must be at least 2 characters';
    }

    if (!trimmedLastName) {
      errors.lastName = 'Last name is required';
    } else if (trimmedLastName.length < 2) {
      errors.lastName = 'Last name must be at least 2 characters';
    }

    // Password validation
    if (!password) {
      errors.password = 'Password is required';
    } else if (password.length < 8) {
      errors.password = 'Password must be at least 8 characters';
    }

    // Return validation errors if any
    if (Object.keys(errors).length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors
      });
    }

    // Check if user already exists
    const existingUser = await userService.getUserByEmail(trimmedEmail);
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User already exists with this email',
        errors: { email: 'This email is already registered' }
      });
    }

    // Create user data object
    const userData = {
      email: trimmedEmail,
      password,
      firstName: trimmedFirstName,
      lastName: trimmedLastName,
      phone: trimmedPhone,
      userType: 'family' // Default to family user type
    };

    // Create user in Supabase
    const { user, error } = await userService.signUp(
      userData.email,
      userData.password,
      {
        firstName: userData.firstName,
        lastName: userData.lastName,
        phone: userData.phone,
        userType: userData.userType
      }
    );

    if (error) throw error;

    // Generate JWT token
    const token = jwt.sign(
      { userId: user.id, email: user.email, userType: userData.userType },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Send welcome email
    try {
      await sendWelcomeEmail({
        to: user.email,
        name: `${userData.firstName} ${userData.lastName}`,
        userType: userData.userType
      });
    } catch (emailError) {
      console.error('Failed to send welcome email:', emailError);
      // Don't fail the request if email fails
    }

    // Return success response
    res.status(201).json({
      success: true,
      message: 'Registration successful',
      data: {
        user: {
          id: user.id,
          email: user.email,
          firstName: userData.firstName,
          lastName: userData.lastName,
          phone: userData.phone,
          userType: userData.userType
        },
        token
      }
    });

  } catch (error) {
    console.error('Registration error:', error);
    
    // Handle specific error cases
    if (error.message && error.message.includes('already registered')) {
      return res.status(400).json({
        success: false,
        message: 'User already exists with this email',
        errors: { email: 'This email is already registered' }
      });
    }

    if (error.message && error.message.includes('weak_password')) {
      return res.status(400).json({
        success: false,
        message: 'Password is too weak',
        errors: { password: 'Please choose a stronger password' }
      });
    }

    // Generic error response
    res.status(500).json({
      success: false,
      message: 'An error occurred during registration',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Login user
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Basic validation
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required',
        errors: {
          ...(!email && { email: 'Email is required' }),
          ...(!password && { password: 'Password is required' })
        }
      });
    }

    // Sign in with Supabase
    const { data, error } = await userService.signIn(email, password);
    
    if (error) throw error;
    if (!data.user) throw new Error('Authentication failed');

    // Get user profile
    const { data: profileData, error: profileError } = await userService.getUserById(data.user.id);
    if (profileError) throw profileError;

    const user = profileData;

    // Generate JWT token
    const token = jwt.sign(
      { userId: user.id, email: user.email, userType: user.user_type },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Return success response with user data and token
    res.json({
      success: true,
      message: 'Login successful',
      data: {
        user: {
          id: user.id,
          email: user.email,
          firstName: user.first_name,
          lastName: user.last_name,
          phone: user.phone,
          userType: user.user_type
        },
        token
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    
    // Handle specific error cases
    if (error.message && (error.message.includes('Invalid login credentials') || 
                         error.message.includes('Email not confirmed'))) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password',
        errors: { 
          email: 'Invalid email or password',
          password: 'Invalid email or password'
        }
      });
    }

    // Generic error response
    res.status(500).json({
      success: false,
      message: 'An error occurred during login',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Get current user
router.get('/me', async (req, res) => {
  try {
    // Get token from header
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'No token provided'
      });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Get user from database
    const { data: user, error } = await userService.getUserById(decoded.userId);
    
    if (error || !user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Return user data
    res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          firstName: user.first_name,
          lastName: user.last_name,
          phone: user.phone,
          userType: user.user_type,
          createdAt: user.created_at,
          updatedAt: user.updated_at
        }
      }
    });

  } catch (error) {
    console.error('Get current user error:', error);
    
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired token',
        error: error.message
      });
    }

    res.status(500).json({
      success: false,
      message: 'An error occurred while fetching user data',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

module.exports = router;
