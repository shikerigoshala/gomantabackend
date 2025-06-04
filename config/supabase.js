const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client with error handling
const initializeSupabase = () => {
  try {
    console.log('Initializing Supabase clients...');
    
    // Get required configuration from environment variables
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    // Validate required configurations
    const missingVars = [];
    if (!supabaseUrl) missingVars.push('SUPABASE_URL');
    if (!supabaseAnonKey) missingVars.push('SUPABASE_ANON_KEY');
    if (!serviceRoleKey) missingVars.push('SUPABASE_SERVICE_ROLE_KEY');

    if (missingVars.length > 0) {
      console.error('❌ Missing required environment variables:', missingVars.join(', '));
      throw new Error(`Missing required Supabase configuration: ${missingVars.join(', ')}`);
    }

    // Log configuration status (safely)
    const maskKey = (key) => key ? `${key.substring(0, 3)}...${key.substring(key.length - 3)}` : 'Not set';
    
    console.log('\n=== Supabase Configuration ===');
    console.log(`URL: ${supabaseUrl}`);
    console.log(`Anon Key: ${maskKey(supabaseAnonKey)}`);
    console.log(`Service Role Key: ${maskKey(serviceRoleKey)}`);
    console.log('============================\n');

    // Initialize regular client for public operations
    let supabase = null;
    try {
      supabase = createClient(supabaseUrl, supabaseAnonKey, {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
          detectSessionInUrl: false
        }
      });
      console.log('✅ Public Supabase client initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize public Supabase client:', error.message);
      throw new Error('Failed to initialize Supabase: ' + error.message);
    }

    // Initialize admin client with service role key
    let supabaseAdmin = null;
    try {
      supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
          detectSessionInUrl: false
        }
      });
      console.log('✅ Admin Supabase client initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize admin Supabase client:', error.message);
      throw new Error('Failed to initialize Supabase admin client: ' + error.message);
    }

    console.log('Supabase client initialized successfully');
    return { supabase, supabaseAdmin };
    
  } catch (error) {
    console.error('❌ Failed to initialize Supabase client:', error.message);
    console.error('Available environment variables:', Object.keys(process.env).filter(k => k.includes('SUPABASE') || k.includes('NEXT_PUBLIC')));
    throw error;
  }
};

const { supabase, supabaseAdmin } = initializeSupabase();

module.exports = {
  supabase,
  supabaseAdmin,
  SUPABASE_URL: process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL,
  SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SERVICE_ROLE_KEY
};
