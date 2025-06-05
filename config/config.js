require('dotenv').config();

const config = {
  supabase: {
    url: process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL,
    anonKey: process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.REACT_APP_SUPABASE_ANON_KEY,
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SERVICE_ROLE_KEY
  },
  server: {
    port: process.env.PORT || 3001,
    env: process.env.NODE_ENV || 'development',
    frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000'
  },
  jwt: {
    secret: process.env.JWT_SECRET || 'your-jwt-secret-key-here'
  }
};

// Validate required configurations
const validate = () => {
  const { supabase } = config;
  const missing = [];

  if (!supabase.url) missing.push('SUPABASE_URL');
  if (!supabase.anonKey) missing.push('SUPABASE_ANON_KEY');
  if (!supabase.serviceRoleKey) missing.push('SUPABASE_SERVICE_ROLE_KEY');

  if (missing.length > 0) {
    console.error('❌ Missing required environment variables:', missing.join(', '));
    console.log('\nAvailable environment variables:', Object.keys(process.env).filter(k => k.includes('SUPABASE') || k.includes('NEXT_PUBLIC')));
    throw new Error(`Missing required configuration: ${missing.join(', ')}`);
  }

  return true;
};

// Validate on load
validate();

module.exports = config;
