// Configuration for the application
const isProduction = process.env.NODE_ENV === 'production';

// Validate required environment variables
const validateConfig = () => {
  const requiredVars = ['REACT_APP_API_KEY'];
  const missing = requiredVars.filter(v => !process.env[v]);
  
  if (missing.length > 0) {
    console.error('❌ Missing required environment variables:', missing.join(', '));
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
};

// Only validate in production
if (isProduction) {
  validateConfig();
}

const config = {
  api: {
    // In production, always use the production URL
    // In development, use REACT_APP_API_URL if set, otherwise default to localhost
    baseUrl: isProduction 
      ? 'https://gomantabackend.onrender.com/api'
      : process.env.REACT_APP_API_URL || 'http://localhost:3001/api',
    
    // API Key for authentication with the backend
    // This must match the API_KEY in the backend's .env.production file
    apiKey: process.env.REACT_APP_API_KEY || 'test-api-key-dev',
    
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
