// Configuration for the application
const isProduction = process.env.NODE_ENV === 'production';
const config = {
  api: {
    // In production, always use the production URL
    // In development, use REACT_APP_API_URL if set, otherwise default to localhost
    baseUrl: isProduction 
      ? 'https://gomantabackend.onrender.com/api'
      : process.env.REACT_APP_API_URL || 'http://localhost:3001/api',
    
    // API Key for authentication with the backend
    // This must match the API_KEY in the backend's .env.production file
    apiKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhjZHlsZXRnb2FiYXh6bnN0aHFqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQyNjMzMTgsImV4cCI6MjA1OTgzOTMxOH0.SSQfKfhXyLcLHUOJnnBXj1SJyKH2tGKKiuRoZ1SN_jI',
    
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
