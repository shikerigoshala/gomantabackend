// Configuration for the application
const config = {
  api: {
    // Use environment variable if available, otherwise use production URL
    baseUrl: process.env.REACT_APP_API_URL || 'https://gomantabackend.onrender.com/api',
    
    // API endpoints
    endpoints: {
      register: '/auth/register',
      registerFamily: '/auth/register/family',
      registerFamilyMember: '/auth/register/family-member',
      // Add other API endpoints here as needed
    }
  }
};

export default config;
