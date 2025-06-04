// Configuration for the application
const isProduction = process.env.NODE_ENV === 'production';
const config = {
  api: {
    // In production, always use the production URL
    // In development, use REACT_APP_API_URL if set, otherwise default to localhost
    baseUrl: isProduction 
      ? 'https://gomantabackend.onrender.com/api'
      : process.env.REACT_APP_API_URL || 'http://localhost:3001/api',
    
    // API endpoints
    endpoints: {
      register: '/auth/register',
      registerFamily: '/auth/register/family',
      registerFamilyMember: '/auth/register/family-member',
      // Add other API endpoints here as needed
    }
  }
};

// Log the API configuration for debugging
console.log('API Configuration:', {
  nodeEnv: process.env.NODE_ENV,
  apiBaseUrl: config.api.baseUrl,
  isProduction: isProduction
});

export default config;
