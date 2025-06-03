 const express = require('express');
const jwt = require('jsonwebtoken');
const router = express.Router();
const { userService } = require('../services/supabase');
const { sendWelcomeEmail } = require('../services/emailService');

// Base register endpoint (for backward compatibility)
router.post('/register', (req, res, next) => {
  // Forward to /register/family by default
  req.url = '/register/family';
  next();
});

// Register family user
router.post('/register/family', async (req, res) => {
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

    // Email validation with better error messages
    const emailRegex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,6}$/;
    const errors = {};
    
    if (!trimmedEmail) {
      errors.email = 'Email address is required';
    } else if (!emailRegex.test(trimmedEmail)) {
      errors.email = 'Please enter a valid email address (e.g., user@example.com)';
    }

    // Phone validation (10 digits)
    const phoneRegex = /^\d{10}$/;
    if (!trimmedPhone) {
      errors.phone = 'Phone number is required';
    } else if (!phoneRegex.test(trimmedPhone)) {
      errors.phone = 'Please enter a valid 10-digit phone number';
    }

    // Return validation errors if any
    if (Object.keys(errors).length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors
      });
    }

    // Check if user already exists
    try {
      const { data: existingUser, error: userCheckError } = await userService.getUserByEmail(trimmedEmail);
      
      if (userCheckError) {
        console.error('Error checking for existing user:', userCheckError);
        // Don't throw the error, just log it and continue
        console.log('Proceeding with registration despite user check error');
      } else if (existingUser) {
        return res.status(409).json({
          success: false,
          message: 'This email is already registered. Please use a different email or try logging in.'
        });
      }
    } catch (error) {
      console.error('Unexpected error during user check:', error);
      // Continue with registration even if check fails
      console.log('Proceeding with registration after user check error');
    }

    // Prepare user data for registration
    const userData = {
      name: `${trimmedFirstName} ${trimmedLastName}`.trim(),
      first_name: trimmedFirstName,
      last_name: trimmedLastName,
      phone: trimmedPhone,
      is_family: true
    };
    
    console.log('Attempting to create user with data:', { email, userData });

    // Create user with Supabase
    let user, error;
    try {
      const result = await userService.signUp(trimmedEmail, password, userData);
      user = result.user;
      error = result.error;
      
      if (error) {
        console.error('Signup error:', error);
        // Handle specific Supabase auth errors
        if (error.message.includes('already registered')) {
          return res.status(409).json({
            success: false,
            message: 'This email is already registered. Please use a different email or try logging in.'
          });
        }
        throw error;
      }
      
      if (!user) {
        throw new Error('User creation failed: No user returned from signup');
      }
      
      console.log('User created successfully:', user.id);
      
      // Send welcome email
      try {
        await sendWelcomeEmail({
          to: trimmedEmail,
          name: `${trimmedFirstName} ${trimmedLastName}`.trim(),
          email: trimmedEmail,
          password: password,
          userId: user.id,
          template: 'welcome'
        });
        console.log('Welcome email sent successfully to:', trimmedEmail);
      } catch (emailError) {
        console.error('Error sending welcome email:', emailError);
        // Don't fail the registration if email sending fails
      }
      
      console.log('User created successfully:', { userId: user.id, email: user.email });
      
    } catch (signupError) {
      console.error('Signup failed:', signupError);
      
      // Handle rate limiting specifically
      if (signupError.message && signupError.message.includes('rate limit')) {
        return res.status(429).json({
          success: false,
          message: 'Too many registration attempts. Please wait a few minutes before trying again.'
        });
      }
      
      // Handle email already in use
      if (signupError.message && signupError.message.includes('already registered')) {
        return res.status(409).json({
          success: false,
          message: 'This email is already registered. Please use a different email or try logging in.'
        });
      }
      
      // Handle other errors
      return res.status(500).json({
        success: false,
        message: signupError.message || 'Failed to create user account. Please try again.',
        code: signupError.code
      });
    }

    if (error || !user) {
      console.error('Family registration error:', error);
      const errorMessage = error?.message || 'Failed to create user account';
      
      // More specific error messages for common cases
      let userFriendlyMessage = 'Registration failed. Please try again.';
      
      if (errorMessage.includes('already registered')) {
        userFriendlyMessage = 'This email is already registered. Please use a different email or try logging in.';
      } else if (errorMessage.includes('weak_password')) {
        userFriendlyMessage = 'Password is too weak. Please use a stronger password.';
      } else if (errorMessage.includes('email')) {
        userFriendlyMessage = 'Please enter a valid email address.';
      }
      
      return res.status(400).json({ 
        success: false,
        message: userFriendlyMessage,
        error: process.env.NODE_ENV === 'development' ? errorMessage : undefined
      });
    }

    // Send welcome email with credentials (in background, don't block response)
    if (process.env.NODE_ENV !== 'test') {
      // Generate a temporary password for the welcome email
      const tempPassword = Math.random().toString(36).slice(-8);
      
      sendWelcomeEmail({
        to: trimmedEmail,
        name: userData.name,
        email: trimmedEmail,
        password: tempPassword, // In production, consider sending a password reset link instead
        amount: 0, // Default amount for welcome email
        template: 'welcome'
      }).then(() => {
        console.log('Welcome email sent successfully to:', trimmedEmail);
      }).catch(emailError => {
        console.error('Failed to send welcome email:', emailError);
        // Log to error tracking service if available
      });
    }

    // Create JWT token
    let token;
    try {
      token = jwt.sign(
        { 
          userId: user.id, 
          email: user.email,
          isFamily: true
        },
        process.env.JWT_SECRET || 'your-secret-key',
        { expiresIn: '24h' }
      );
    } catch (tokenError) {
      console.error('Token generation failed:', tokenError);
      // Continue without token - client will need to log in
    }

    // Return user data (without sensitive info)
    const userResponse = {
      id: user.id,
      name: userData.name,
      email: user.email,
      phone: userData.phone,
      isFamily: true
    };

    // Set secure httpOnly cookie
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 24 * 60 * 60 * 1000 // 24 hours
    });

    return res.status(201).json({
      success: true,
      message: 'Family registration successful',
      user: userResponse,
      token: token // Also send in response for client-side storage if needed
    });
  } catch (error) {
    console.error('Family registration error:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred during registration',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Send family member welcome email
router.post('/send-family-email', async (req, res) => {
  try {
    const { email, name, password, amount } = req.body;

    // Validate required fields
    if (!email || !name || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email, name, and password are required'
      });
    }

    // Send welcome email with login credentials
    await sendWelcomeEmail({
      to: email,
      subject: 'Welcome to Gomata Donation - Family Member Account Created',
      template: 'family_welcome',
      context: {
        name,
        email,
        password,
        amount
      }
    });

    res.status(200).json({
      success: true,
      message: 'Email sent successfully'
    });
  } catch (error) {
    console.error('Error sending family email:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send email',
      error: error.message
    });
  }
});

// Regular user registration
router.post('/signup', async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // Validate required fields
    if (!name || !email || !password) {
      return res.status(400).json({ 
        success: false,
        message: 'Name, email, and password are required' 
      });
    }

    // Create user with Supabase
    const userData = {
      name,
      phone: req.body.phone || ''
    };

    const { user: registeredUser, error: signUpError } = await userService.signUp(email, password, userData);

    if (signUpError) {
      return res.status(400).json({ 
        success: false,
        message: signUpError.message || 'Registration failed',
        error: signUpError.message
      });
    }

    // Create token for the registered user
    const token = jwt.sign(
      { userId: registeredUser.id, email: registeredUser.email },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '24h' }
    );

    // Return user data without sensitive information
    const userResponse = {
      id: registeredUser.id,
      name: userData.name,
      email: registeredUser.email,
      phone: userData.phone || null,
      isFamily: userData.is_family || false
    };

    res.status(201).json({
      success: true,
      message: 'Registration successful',
      user: userResponse,
      token
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ 
      message: 'Server error during registration',
      error: error.message // Include error message for debugging
    });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate required fields
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    // Sign in with Supabase
    const { data, error } = await userService.signIn(email, password);

    if (error) {
      // Check if this is an email confirmation error
      if (error.message && error.message.includes('Email not confirmed')) {
        return res.status(401).json({ 
          message: 'Email not confirmed. Please check your inbox for a confirmation email.',
          needsEmailConfirmation: true,
          email: email
        });
      }
      
      return res.status(400).json({ 
        message: error.message || 'Invalid email or password',
        error: error.message
      });
    }

    // Get user profile
    const userProfile = await userService.getUserProfile(data.user.id);

    // Create token
    const token = jwt.sign(
      { userId: data.user.id, email: data.user.email },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '24h' }
    );

    // Return user data
    const userResponse = {
      id: data.user.id,
      name: userProfile?.name || '',
      email: data.user.email
    };

    res.json({
      message: 'Login successful',
      user: userResponse,
      token
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error during login' });
  }
});

// Logout
router.post('/logout', (req, res) => {
  res.clearCookie('token');
  res.json({ message: 'Logged out successfully' });
});

module.exports = router;
