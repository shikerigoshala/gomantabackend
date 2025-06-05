// Configuration for the application
const isProduction = process.env.NODE_ENV === 'production';

// Validate required environment variables
const validateConfig = () => {
  // Check if we have either API key
  const hasApiKey = process.env.REACT_APP_API_KEY || process.env.REACT_APP_SUPABASE_ANON_KEY;
  
  if (!hasApiKey) {
    console.error('❌ Missing required environment variable: REACT_APP_API_KEY or REACT_APP_SUPABASE_ANON_KEY');
    throw new Error('Missing required environment variable: API key not found');
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
    // Use Supabase anon key as the API key for consistency
    apiKey: process.env.REACT_APP_API_KEY || process.env.REACT_APP_SUPABASE_ANON_KEY || (isProduction ? undefined : 'test-api-key-dev'),
    
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
const logSafeKey = (key) => {
  if (!key || typeof key !== 'string') return 'not-set';
  const length = key.length;
  if (length <= 8) return '***';
  return `${key.substring(0, 3)}...${key.substring(length - 3)} (${length} chars)`;
};

console.log('API Configuration:', {
  nodeEnv: process.env.NODE_ENV,
  apiBaseUrl: config.api.baseUrl,
  isProduction: isProduction,
  apiKeySource: process.env.REACT_APP_API_KEY ? 'REACT_APP_API_KEY' 
    : process.env.REACT_APP_SUPABASE_ANON_KEY ? 'REACT_APP_SUPABASE_ANON_KEY' 
    : 'test-api-key-dev',
  apiKey: logSafeKey(config.api.apiKey)
});

export default config;
