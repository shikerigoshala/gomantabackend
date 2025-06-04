import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { userService } from '../../services/supabase';
import { toast } from 'react-hot-toast';
import config from '../../config';

const Register = ({ onLogin }) => {
  const [userType, setUserType] = useState('default');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    familyId: ''
  });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  
  // Check if user is already logged in
  useEffect(() => {
    const checkUser = async () => {
      try {
        const user = await userService.getCurrentUser();
        if (user) {
          // User is already logged in, redirect to dashboard
          navigate('/dashboard');
        }
      } catch (error) {
        console.error('Error checking user status:', error);
      }
    };
    
    checkUser();
  }, [navigate]);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    // Validation
    const errors = {};
    
    // Required fields
    if (!formData.name.trim()) errors.name = 'Full name is required';
    if (!formData.email.trim()) errors.email = 'Email is required';
    if (!formData.phone.trim()) errors.phone = 'Phone number is required';
    if (!formData.password) errors.password = 'Password is required';
    if (!formData.confirmPassword) errors.confirmPassword = 'Please confirm your password';
    
    // Password match
    if (formData.password !== formData.confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
    }
    
    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (formData.email && !emailRegex.test(formData.email)) {
      errors.email = 'Please enter a valid email address';
    }
    
    // Phone number validation (10 digits)
    const phoneRegex = /^\d{10}$/;
    if (formData.phone && !phoneRegex.test(formData.phone)) {
      errors.phone = 'Phone number must be 10 digits';
    }
    
    // Show all validation errors
    if (Object.keys(errors).length > 0) {
      Object.values(errors).forEach(error => toast.error(error));
      setError('Please fix the form errors');
      setIsLoading(false);
      return;
    }

    try {
      // Split full name into first and last name for the API
      const nameParts = formData.name.trim().split(' ');
      const firstName = nameParts[0] || '';
      const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : '';
      
      // Prepare user data with type information
      const userData = {
        firstName: firstName,
        lastName: lastName,
        email: formData.email.trim(),
        phone: formData.phone.trim(),
        password: formData.password
      };
      
      // Log the configuration being used
      console.log('Using configuration:', {
        nodeEnv: process.env.NODE_ENV,
        configBaseUrl: config.api.baseUrl,
        userType: userType
      });

      // Get the appropriate API endpoint based on user type
      let endpoint;
      switch(userType) {
        case 'familyHead':
          endpoint = config.api.endpoints.registerFamily;
          break;
        case 'familyMember':
          endpoint = config.api.endpoints.registerFamilyMember;
          break;
        default:
          endpoint = config.api.endpoints.register;
      }
      
      // Construct the API URL using only the config baseUrl
      const apiUrl = `${config.api.baseUrl.replace(/\/$/, '')}${endpoint}`;
      console.log('Making request to:', apiUrl);
      
      // Call the appropriate registration endpoint based on user type
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData)
      });

      let data;
      try {
        data = await response.json();
      } catch (parseError) {
        console.error('Error parsing JSON response:', parseError);
        const text = await response.text();
        console.error('Raw response text:', text);
        throw new Error('Invalid response from server');
      }
      
      console.log('Registration response:', {
        status: response.status,
        statusText: response.statusText,
        data: data
      });
      
      // Handle any errors from the signup process
      if (!response.ok) {
        const errorMsg = data?.message || data?.error || 'Registration failed. Please try again.';
        console.error('Registration error:', errorMsg, data);
        toast.error(errorMsg);
        setError(errorMsg);
        setIsLoading(false);
        return;
      }
      
      // Verify we have user data
      if (!data || !data.user) {
        const errorMsg = 'Registration failed. User data not returned.';
        toast.error(errorMsg);
        setError(errorMsg);
        setIsLoading(false);
        return;
      }
      
      const { user } = data;

      // Call the onLogin callback with user data if provided
      if (onLogin && user) {
        onLogin(user);
      }

      // Show success message
      const successMessage = userType === 'familyHead' 
        ? 'Family account created successfully! Please check your email for verification.'
        : userType === 'familyMember'
          ? 'You have been added to the family group! Please check your email for verification.'
          : 'Registration successful! Please check your email for verification.';
      
      toast.success(successMessage);

      // Navigate to login page after a short delay
      setTimeout(() => navigate('/login'), 2000);
    } catch (err) {
      console.error('Registration error:', err);
      const errorMsg = err.message || 'Registration failed. Please try again.';
      toast.error(errorMsg);
      setError(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-emerald-100 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-emerald-800 mb-2">Create Account</h2>
          <p className="text-gray-600 mb-4">Sign up for a new account</p>
          
          {/* User Type Tabs */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">Register As</label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setUserType('default')}
                className={`py-2 px-4 text-center text-sm font-medium rounded-lg transition-colors ${
                  userType === 'default'
                    ? 'bg-emerald-100 text-emerald-700 border border-emerald-200 shadow-sm'
                    : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
                }`}
              >
                Default User
              </button>
              <button
                type="button"
                onClick={() => setUserType('familyHead')}
                className={`py-2 px-4 text-center text-sm font-medium rounded-lg transition-colors ${
                  userType === 'familyHead'
                    ? 'bg-blue-100 text-blue-700 border border-blue-200 shadow-sm'
                    : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
                }`}
              >
                Family Head
              </button>
              <button
                type="button"
                onClick={() => setUserType('familyMember')}
                className={`py-2 px-4 text-center text-sm font-medium rounded-lg transition-colors ${
                  userType === 'familyMember'
                    ? 'bg-purple-100 text-purple-700 border border-purple-200 shadow-sm'
                    : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
                }`}
              >
                Family Member
              </button>
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 rounded-lg p-4 mb-6">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700">
              Full Name
            </label>
            <input
              id="name"
              name="name"
              type="text"
              required
              value={formData.name}
              onChange={handleChange}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            />
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700">
              Email Address
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              value={formData.email}
              onChange={handleChange}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            />
          </div>
          
          <div>
            <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
              Phone Number
            </label>
            <input
              id="phone"
              name="phone"
              type="tel"
              value={formData.phone}
              onChange={handleChange}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            />
          </div>

          {userType === 'familyMember' && (
            <div>
              <label htmlFor="familyId" className="block text-sm font-medium text-gray-700">
                Family ID
              </label>
              <input
                id="familyId"
                name="familyId"
                type="text"
                required={userType === 'familyMember'}
                value={formData.familyId}
                onChange={handleChange}
                placeholder="Enter your family's unique ID"
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <p className="mt-1 text-xs text-gray-500">Please ask your family head for this ID</p>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                minLength={6}
                value={formData.password}
                onChange={handleChange}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              />
            </div>
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                Confirm Password
              </label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                required
                minLength={6}
                value={formData.confirmPassword}
                onChange={handleChange}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              />
            </div>
          </div>

          <div className="mt-4 p-4 rounded-lg bg-gray-50 border border-gray-100">
            {userType === 'familyHead' && (
              <div className="space-y-2">
                <h3 className="text-sm font-medium text-blue-800">Family Head Benefits</h3>
                <ul className="text-xs text-gray-600 space-y-1 list-disc list-inside">
                  <li>Create and manage your family group</li>
                  <li>Add and manage family members</li>
                  <li>Track family donations and activities</li>
                </ul>
              </div>
            )}
            
            {userType === 'familyMember' && (
              <div className="space-y-2">
                <h3 className="text-sm font-medium text-purple-800">Family Member Benefits</h3>
                <ul className="text-xs text-gray-600 space-y-1 list-disc list-inside">
                  <li>Join an existing family group</li>
                  <li>View family activities and donations</li>
                  <li>Connect with your family members</li>
                </ul>
              </div>
            )}
            
            {userType === 'default' && (
              <div className="space-y-2">
                <h3 className="text-sm font-medium text-emerald-800">User Benefits</h3>
                <ul className="text-xs text-gray-600 space-y-1 list-disc list-inside">
                  <li>Make donations and track your contributions</li>
                  <li>View your donation history</li>
                  <li>Receive updates and notifications</li>
                </ul>
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className={`w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white ${
              isLoading 
                ? 'bg-gray-400' 
                : userType === 'familyHead' 
                  ? 'bg-blue-600 hover:bg-blue-700' 
                  : userType === 'familyMember'
                    ? 'bg-purple-600 hover:bg-purple-700'
                    : 'bg-emerald-600 hover:bg-emerald-700'
            } focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 transition-colors duration-200`}
          >
            {isLoading ? (
              <>
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Creating Account...
              </>
            ) : (
              `Sign Up as ${userType === 'familyHead' ? 'Family Head' : userType === 'familyMember' ? 'Family Member' : 'User'}`
            )}
          </button>
          
          <div className="text-center mt-4">
            <p className="text-sm text-gray-600">
              Already have an account?{' '}
              <Link to="/login" className="font-medium text-emerald-600 hover:text-emerald-800 transition-colors">
                Sign in
              </Link>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Register;
