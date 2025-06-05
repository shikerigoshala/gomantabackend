import React, { useState } from 'react';
import { toast } from 'react-hot-toast';
import { FiMail, FiPhone, FiLock, FiArrowRight } from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';
import config from '../../config';

const FamilyRegistrationModal = ({ isOpen, onClose, onRegisterSuccess }) => {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: ''
  });
  const navigate = useNavigate();
  const [formErrors, setFormErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const validateForm = () => {
    const errors = {};
    let isValid = true;

    // Check required fields
    const trimmedData = {
      firstName: formData.firstName.trim(),
      lastName: formData.lastName.trim(),
      email: formData.email.trim().toLowerCase(),
      phone: formData.phone.trim().replace(/\s+/g, ''), // Remove all whitespace
      password: formData.password,
      confirmPassword: formData.confirmPassword
    };

    // First Name validation
    if (!trimmedData.firstName) {
      errors.firstName = 'First name is required';
      isValid = false;
    }

    // Last Name validation
    if (!trimmedData.lastName) {
      errors.lastName = 'Last name is required';
      isValid = false;
    }

    // Email validation
    const emailRegex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,6}$/;
    if (!trimmedData.email) {
      errors.email = 'Email is required';
      isValid = false;
    } else if (!emailRegex.test(trimmedData.email)) {
      errors.email = 'Please enter a valid email address (e.g., example@domain.com)';
      isValid = false;
    }

    // Phone validation
    const phoneRegex = /^[0-9]{10}$/;
    if (!trimmedData.phone) {
      errors.phone = 'Phone number is required';
      isValid = false;
    } else if (!phoneRegex.test(trimmedData.phone)) {
      errors.phone = 'Please enter a valid 10-digit phone number';
      isValid = false;
    }

    // Password validation
    if (!trimmedData.password) {
      errors.password = 'Password is required';
      isValid = false;
    } else if (trimmedData.password.length < 6) {
      errors.password = 'Password must be at least 6 characters';
      isValid = false;
    }

    // Confirm Password validation
    if (!trimmedData.confirmPassword) {
      errors.confirmPassword = 'Please confirm your password';
      isValid = false;
    } else if (trimmedData.password !== trimmedData.confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
      isValid = false;
    }

    // Update form data with trimmed values
    if (isValid) {
      setFormData(prev => ({
        ...prev,
        ...trimmedData
      }));
    }
    
    setFormErrors(errors);
    
    if (!isValid) {
      // Show the first error message
      const firstError = Object.values(errors)[0];
      if (firstError) {
        toast.error(firstError);
      }
      return false;
    }
    
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
<<<<<<< HEAD
    
    // Clear previous errors
    setFormErrors({});
    
    if (!validateForm()) {
      return;
    }
    
    setIsLoading(true);
    
    try {
      // Prepare the data with trimmed and formatted values
=======
    setIsLoading(true);
    setFormErrors({});

    // Basic validation
    const errors = validateForm();
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      setIsLoading(false);
      return;
    }

    try {
>>>>>>> 711a1b8b1ec2ca9e8bffac396c8c72d1093f12d3
      const registrationData = {
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        email: formData.email.trim().toLowerCase(),
<<<<<<< HEAD
        phone: formData.phone.trim().replace(/\s+/g, ''), // Remove all whitespace
        password: formData.password,
        isFamily: true
      };
      
      console.log('Sending registration data:', registrationData);
      
      
      const response = await fetch(`${config.api.baseUrl}${config.api.endpoints.registerFamily}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(registrationData)
      });

      const data = await response.json();
      console.log('Registration response:', data);

      if (!response.ok) {
        if (data.errors) {
          // Handle field-specific errors from the server
          setFormErrors(data.errors);
          // Show the first error message
          const firstError = Object.values(data.errors)[0];
          if (firstError) {
            toast.error(firstError);
          }
        } else {
          throw new Error(data.message || 'Registration failed. Please try again.');
        }
        return;
=======
        phone: formData.phone.trim().replace(/\s+/g, ''),
        password: formData.password,
        confirmPassword: formData.confirmPassword,
      };

      // Get API key from config
      const apiKey = config.api.apiKey;
      
      if (!apiKey) {
        throw new Error('API key is not configured. Please check your configuration.');
      }

      // Debug: Log the API key being used
      console.log('🔑 Using API key:', {
        key: apiKey ? `${apiKey.substring(0, 5)}...${apiKey.substring(apiKey.length - 3)}` : 'MISSING',
        fromConfig: config.api.apiKey ? '✅ Found in config' : '❌ Missing in config',
        length: apiKey ? apiKey.length : 0
      });

      const requestOptions = {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey, // Using lowercase header name for consistency
          'X-Requested-With': 'XMLHttpRequest' // Helps identify AJAX requests
        },
        body: JSON.stringify(registrationData),
        credentials: 'include' // Include cookies if needed
      };
      
      // Log the request (without sensitive data)
      console.log('📤 Sending registration request:', {
        url: `${config.api.baseUrl}${config.api.endpoints.registerFamily}`,
        method: 'POST',
        headers: {
          ...requestOptions.headers,
          'x-api-key': apiKey || ''
        },
        body: {
          ...registrationData,
          password: '••••••••',
          confirmPassword: '••••••••',
          _debug: {
            apiUrl: config.api.baseUrl,
            endpoint: config.api.endpoints.registerFamily,
            fullUrl: `${config.api.baseUrl}${config.api.endpoints.registerFamily}`
          }
        }
      });
      
      // Log request details (safely masking sensitive data)
      console.log('=== Family Registration Request ===');
      console.log('API URL:', config.api.baseUrl);
      console.log('Endpoint:', config.api.endpoints.registerFamily);
      console.log('API Key:', apiKey ? `${apiKey.substring(0, 5)}...${apiKey.substring(apiKey.length - 3)}` : 'MISSING');
      console.log('================================');
      
      const startTime = Date.now();
      let response;
      let data;
      
      try {
        response = await fetch(
          `${config.api.baseUrl}${config.api.endpoints.registerFamily}`, 
          requestOptions
        );
        
        // First check if we got a response at all
        if (!response) {
          throw new Error('No response received from server');
        }
        
        // Try to parse JSON response
        try {
          data = await response.json();
        } catch (jsonError) {
          console.error('Failed to parse JSON response:', jsonError);
          const text = await response.text();
          console.error('Raw response:', text);
          throw new Error('Invalid response from server');
        }
        
        console.log(`📥 Received response in ${Date.now() - startTime}ms:`, {
          status: response.status,
          statusText: response.statusText,
          data: data
        });
        
        if (!response.ok) {
          // Handle HTTP errors (4xx, 5xx)
          if (data && data.errors) {
            // Handle field-specific errors from the server
            setFormErrors(data.errors);
            // Show the first error message
            const firstError = Object.values(data.errors)[0];
            if (firstError) {
              toast.error(firstError);
            }
          } else {
            // Handle other HTTP errors
            const errorMessage = data?.message || 
                               data?.error?.message || 
                               `Server responded with status ${response.status}`;
            throw new Error(errorMessage);
          }
          return;
        }
      } catch (fetchError) {
        console.error('❌ Registration request failed:', fetchError);
        throw new Error(fetchError.message || 'Failed to connect to the server. Please try again.');
>>>>>>> 711a1b8b1ec2ca9e8bffac396c8c72d1093f12d3
      }

      // Prepare user data for success callback
      const userData = {
        id: data.user?.id,
        email: formData.email.trim().toLowerCase(),
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        phone: formData.phone.trim().replace(/\s+/g, ''),
        isFamily: true
      };

      // Clear form on success
      setFormData({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        password: '',
        confirmPassword: ''
      });
      
      setFormErrors({});
      toast.success('Registration successful! Please check your email to verify your account.');
      
      // Close the modal after a short delay and trigger success callback
      setTimeout(() => {
        onClose();
        if (onRegisterSuccess) {
          onRegisterSuccess(userData);
        }
      }, 1500);
      
    } catch (error) {
      console.error('Registration error:', error);
      
      // Handle different types of errors
      if (error.name === 'TypeError' && error.message.includes('Failed to fetch')) {
        toast.error('Unable to connect to the server. Please check your internet connection.');
      } else if (error.message.includes('rate limit')) {
        toast.error('Too many registration attempts. Please wait a few minutes before trying again.');
      } else {
        console.error('Registration error details:', error);
        toast.error(error.message || 'An unexpected error occurred. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className={`fixed inset-0 z-50 overflow-y-auto ${isOpen ? 'block' : 'hidden'}`}>
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 transition-opacity" onClick={onClose}>
          <div className="absolute inset-0 bg-gray-900/50 backdrop-blur-sm"></div>
        </div>

        <span className="hidden sm:inline-block sm:align-middle sm:h-screen">&#8203;</span>

        <div className="inline-block w-full max-w-md p-6 my-8 overflow-hidden text-left align-middle transition-all transform bg-white shadow-xl rounded-2xl">
          <div className="flex flex-col items-center">
           
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Create Family Account</h2>
            <p className="text-gray-500 mb-6">Join our community and start your journey</p>
            
            <form onSubmit={handleSubmit} className="w-full space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <div className="relative">
                    <input
                      type="text"
                      id="firstName"
                      name="firstName"
                      value={formData.firstName}
                      onChange={handleChange}
                      placeholder="First Name"
                      className={`block w-full px-4 py-3 text-gray-900 bg-white border ${
                        formErrors.firstName ? 'border-red-500' : 'border-gray-200 hover:border-gray-300'
                      } rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all duration-200 outline-none`}
                      required
                    />
                  </div>
                  {formErrors.firstName && (
                    <p className="text-xs text-red-600 mt-1">{formErrors.firstName}</p>
                  )}
                </div>
                <div className="space-y-1">
                  <div className="relative">
                    <input
                      type="text"
                      id="lastName"
                      name="lastName"
                      value={formData.lastName}
                      onChange={handleChange}
                      placeholder="Last Name"
                      className={`block w-full px-4 py-3 text-gray-900 bg-white border ${
                        formErrors.lastName ? 'border-red-500' : 'border-gray-200 hover:border-gray-300'
                      } rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all duration-200 outline-none`}
                      required
                    />
                  </div>
                  {formErrors.lastName && (
                    <p className="text-xs text-red-600 mt-1">{formErrors.lastName}</p>
                  )}
                </div>
              </div>

              <div className="space-y-1">
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <FiMail className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="Email Address"
                    className={`block w-full pl-10 pr-4 py-3 text-gray-900 bg-white border ${
                      formErrors.email ? 'border-red-500' : 'border-gray-200 hover:border-gray-300'
                    } rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all duration-200 outline-none`}
                    required
                  />
                </div>
                {formErrors.email && (
                  <p className="text-xs text-red-600 mt-1">{formErrors.email}</p>
                )}
              </div>

              <div className="space-y-1">
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <FiPhone className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="tel"
                    id="phone"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    placeholder="Phone Number"
                    className={`block w-full pl-10 pr-4 py-3 text-gray-900 bg-white border ${
                      formErrors.phone ? 'border-red-500' : 'border-gray-200 hover:border-gray-300'
                    } rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all duration-200 outline-none`}
                    required
                  />
                </div>
                {formErrors.phone && (
                  <p className="text-xs text-red-600 mt-1">{formErrors.phone}</p>
                )}
              </div>

              <div className="space-y-1">
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <FiLock className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="password"
                    id="password"
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="Password (min 6 characters)"
                    className={`block w-full pl-10 pr-4 py-3 text-gray-900 bg-white border ${
                      formErrors.password ? 'border-red-500' : 'border-gray-200 hover:border-gray-300'
                    } rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all duration-200 outline-none`}
                    required
                    minLength="6"
                  />
                </div>
                {formErrors.password && (
                  <p className="text-xs text-red-600 mt-1">{formErrors.password}</p>
                )}
              </div>

              <div className="space-y-1">
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <FiLock className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="password"
                    id="confirmPassword"
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    placeholder="Confirm Password"
                    className={`block w-full pl-10 pr-4 py-3 text-gray-900 bg-white border ${
                      formErrors.confirmPassword ? 'border-red-500' : 'border-gray-200 hover:border-gray-300'
                    } rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all duration-200 outline-none`}
                    required
                    minLength="6"
                  />
                </div>
                {formErrors.confirmPassword && (
                  <p className="text-xs text-red-600 mt-1">{formErrors.confirmPassword}</p>
                )}
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-lg text-white bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 disabled:opacity-70 disabled:cursor-not-allowed transition-all duration-200 shadow-md hover:shadow-lg"
                >
                  {isLoading ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Creating Account...
                    </>
                  ) : (
                    <>
                      Create Account
                      <FiArrowRight className="w-5 h-5 ml-1 group-hover:translate-x-1 transition-transform" />
                    </>
                  )}
                </button>
              </div>
              
              <div className="mt-6 text-center">
                <p className="text-sm text-gray-600">
                  Already have an account?{' '}
                  <button
                    type="button"
                    onClick={() => navigate('/login')}
                    className="font-medium text-emerald-600 hover:text-emerald-500 focus:outline-none focus:underline focus:ring-2 focus:ring-emerald-100 rounded px-1.5 py-0.5"
                  >
                    Sign in here
                  </button>
                </p>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FamilyRegistrationModal;
