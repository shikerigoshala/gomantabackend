const { createClient } = require('@supabase/supabase-js');

// Create singleton Supabase clients with lazy loading
let supabaseClient = null;
let supabaseAdminClient = null;

const getSupabaseClient = (useAdmin = false) => {
  try {
    // Get required configuration
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    // Validate required configurations
    const missingVars = [];
    if (!supabaseUrl) missingVars.push('SUPABASE_URL');
    if (!supabaseAnonKey) missingVars.push('SUPABASE_ANON_KEY');
    if (useAdmin && !serviceRoleKey) missingVars.push('SUPABASE_SERVICE_ROLE_KEY');

    if (missingVars.length > 0) {
      console.error('❌ Missing required environment variables:', missingVars.join(', '));
      throw new Error(`Missing required Supabase configuration: ${missingVars.join(', ')}`);
    }

    // Return existing client if already initialized
    if (useAdmin) {
      if (supabaseAdminClient) return supabaseAdminClient;

      // Initialize admin client with service role key
      supabaseAdminClient = createClient(supabaseUrl, serviceRoleKey, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
          detectSessionInUrl: false
        }
      });
      console.log('✅ Admin Supabase client initialized successfully');
      return supabaseAdminClient;
    } else {
      if (supabaseClient) return supabaseClient;

      // Initialize regular client with anon key
      supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
          detectSessionInUrl: false
        }
      });
      console.log('✅ Public Supabase client initialized successfully');
      return supabaseClient;
    }
  } catch (error) {
    console.error('❌ Failed to initialize Supabase client:', error.message);
    throw error;
  }
};

// For backward compatibility
const supabase = getSupabaseClient();

// Helper: Map DB donation (snake_case) to JS (camelCase)
function mapDonationFromDb(dbDonation) {
  if (!dbDonation) return null;

  return {
    id: dbDonation.id,
    userId: dbDonation.user_id,
    donationType: dbDonation.type,
    amount: dbDonation.amount,
    status: dbDonation.status,
    paymentId: dbDonation.payment_id,
    merchantOrderId: dbDonation.payment_id, // Use payment_id as merchant order ID
    paymentDetails: dbDonation.payment_details,
    donorInfo: dbDonation.donor_info,
    familyInfo: dbDonation.family_info,
    createdAt: dbDonation.created_at,
    updatedAt: dbDonation.updated_at
  };
}

// Donation service with local storage fallback
const donationService = {
  // Local storage for donations (temporary solution for RLS issues)
  _localDonations: [],
  _lastDonationId: 0,

  // Try to create a donation in Supabase
  async createDonation(donationData) {
    try {
      // Format the data for Supabase
      const formattedData = {
        user_id: donationData.userId || null,
        type: donationData.donationType || donationData.type,
        amount: donationData.amount,
        status: donationData.status || 'PENDING',
        payment_id: donationData.payment_id || null,
        payment_details: typeof donationData.payment_details === 'string'
          ? donationData.payment_details
          : JSON.stringify(donationData.payment_details || {}),
        donor_info: typeof donationData.donorInfo === 'string'
          ? donationData.donorInfo
          : JSON.stringify(donationData.donorInfo || {}),
        family_info: typeof donationData.familyInfo === 'string'
          ? donationData.familyInfo
          : JSON.stringify(donationData.familyInfo || {})
      };
      
      console.log('Attempting to create donation in Supabase:', formattedData);
      
      // Try to insert into Supabase
      const { data, error } = await supabase
        .from('donations')
        .insert(formattedData)
        .select();

      if (error) {
        console.error('Error creating donation in Supabase:', error);
        throw new Error(error.message);
      }

      return data[0];
    } catch (error) {
      console.error('Error in createDonation:', error);
      throw error;
    }
  },
  
  // Create donation in local storage (fallback for RLS issues)
  _createLocalDonation(donationData) {
    // Format the data
    const formattedData = {
      id: ++this._lastDonationId,
      user_id: donationData.userId || null,
      type: donationData.donationType || donationData.type,
      amount: donationData.amount,
      status: donationData.status || 'PENDING',
      payment_id: donationData.payment_id || null,
      payment_details: typeof donationData.payment_details === 'string'
        ? donationData.payment_details
        : JSON.stringify(donationData.payment_details || {}),
      donor_info: typeof donationData.donorInfo === 'string'
        ? donationData.donorInfo
        : JSON.stringify(donationData.donorInfo || {}),
      family_info: typeof donationData.familyInfo === 'string'
        ? donationData.familyInfo
        : JSON.stringify(donationData.familyInfo || {}),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    console.log('Creating donation in local storage:', formattedData);
    
    // Store in local memory (bypassing Supabase RLS issues)
    this._localDonations.push(formattedData);
    console.log('Donation stored locally. Total donations:', this._localDonations.length);
    
    return formattedData;
  },

  // Get donation by ID
  async getDonationById(id) {
    try {
      // First try local storage
      const localDonation = this._localDonations.find(d => d.id === parseInt(id));
      if (localDonation) {
        console.log('Found donation in local storage:', id);
        return mapDonationFromDb(localDonation);
      }
      
      // Fall back to Supabase if not found locally
      const { data, error } = await supabase
        .from('donations')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        console.error('Error getting donation from Supabase:', error);
        return null;
      }

      return mapDonationFromDb(data);
    } catch (error) {
      console.error('Error in getDonationById:', error);
      return null;
    }
  },

  // Get donations by user ID
  async getDonationsByUserId(userId) {
    try {
      // First try local storage
      const localDonations = this._localDonations.filter(d => d.user_id === userId);
      if (localDonations.length > 0) {
        console.log('Found donations in local storage:', userId);
        return localDonations.map(mapDonationFromDb);
      }
      
      // Fall back to Supabase if not found locally
      const { data, error } = await supabase
        .from('donations')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error getting donations from Supabase:', error);
        return [];
      }

      return Array.isArray(data) ? data.map(mapDonationFromDb) : [];
    } catch (error) {
      console.error('Error in getDonationsByUserId:', error);
      return [];
    }
  },

  // Get donation by merchant order ID (payment_id in our case)
  async getDonationByMerchantOrderId(merchantOrderId) {
    try {
      // First try local storage
      const localDonation = this._localDonations.find(d => d.payment_id === merchantOrderId);
      if (localDonation) {
        console.log('Found donation by payment_id in local storage:', merchantOrderId);
        return mapDonationFromDb(localDonation);
      }
      
      // Fall back to Supabase
      const { data, error } = await supabase
        .from('donations')
        .select('*')
        .eq('payment_id', merchantOrderId)
        .single();
      
      if (error) {
        console.error('Error getting donation by payment_id:', error);
        return null;
      }
      
      return mapDonationFromDb(data);
    } catch (error) {
      console.error('Error in getDonationByMerchantOrderId:', error);
      return null;
    }
  },

  // Get donation by payment ID
  async getDonationByPaymentId(paymentId) {
    try {
      // First try local storage
      const localDonation = this._localDonations.find(d => d.payment_id === paymentId);
      if (localDonation) {
        console.log('Found donation by payment_id in local storage:', paymentId);
        return mapDonationFromDb(localDonation);
      }
      
      // Fall back to Supabase
      const { data, error } = await supabase
        .from('donations')
        .select('*')
        .eq('payment_id', paymentId)
        .single();
      
      if (error) {
        console.error('Error getting donation by payment_id:', error);
        return null;
      }
      
      return mapDonationFromDb(data);
    } catch (error) {
      console.error('Error in getDonationByPaymentId:', error);
      return null;
    }
  },

  // Update donation
  async updateDonation(id, updateData) {
    try {
      // First try to update in local storage
      const index = this._localDonations.findIndex(d => d.id === parseInt(id));
      if (index !== -1) {
        // Update local donation
        const donation = this._localDonations[index];
        const updatedDonation = {
          ...donation,
          ...updateData,
          updated_at: new Date().toISOString()
        };
        
        this._localDonations[index] = updatedDonation;
        console.log('Updated donation in local storage:', id);
        return mapDonationFromDb(updatedDonation);
      }
      
      // Fall back to Supabase
      const { data, error } = await supabase
        .from('donations')
        .update({
          ...updateData,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select();
      
      if (error) {
        console.error('Error updating donation in Supabase:', error);
        throw new Error(error.message);
      }
      
      return mapDonationFromDb(data[0]);
    } catch (error) {
      console.error('Error in updateDonation:', error);
      throw error;
    }
  }
};

// User service
const userService = {
  // Sign up a new user
  async signUp(email, password, userData) {
    try {
      // Get admin client for user creation (bypasses RLS)
      const adminClient = getSupabaseClient(true);
      
      // First, check if user already exists
      const { data: existingUser } = await adminClient
        .from('users')
        .select('id')
        .eq('email', email)
        .maybeSingle();

      if (existingUser) {
        return { 
          user: null, 
          error: { 
            message: 'User with this email already exists',
            code: 'user_already_exists'
          } 
        };
      }

      // Prepare user data with defaults
      const userProfile = {
        email: email.trim().toLowerCase(),
        name: (userData.name || '').trim() || null,
        first_name: (userData.firstName || userData.first_name || '').trim() || null,
        last_name: (userData.lastName || userData.last_name || '').trim() || null,
        phone: (userData.phone || '').trim() || null,
        is_family: Boolean(userData.is_family)
      };
      
      // First, create the auth user
      const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
        email: userProfile.email,
        password,
        email_confirm: true, // Auto-confirm the email
        user_metadata: {
          ...userData,
          is_family: userProfile.is_family
        }
      });

      if (authError) {
        console.error('Auth error during signup:', authError);
        return { 
          user: null, 
          error: {
            message: authError.message || 'Failed to create user account',
            code: authError.code || 'auth_error'
          } 
        };
      }

      // Then, create a user profile in the public.users table
      const { data: profileData, error: profileError } = await adminClient
        .from('users')
        .insert([{ ...userProfile, id: authData.user.id }])
        .select()
        .single();

      if (profileError) {
        console.error('Profile creation error:', profileError);
        
        // Try to clean up the auth user if profile creation fails
        try {
          await adminClient.auth.admin.deleteUser(authData.user.id);
        } catch (cleanupError) {
          console.error('Failed to clean up auth user after profile creation failed:', cleanupError);
        }
        
        return { 
          user: null, 
          error: {
            message: profileError.message || 'Failed to create user profile',
            code: profileError.code || 'profile_creation_error'
          } 
        };
      }

      return { 
        user: { 
          ...authData.user, 
          ...profileData 
        }, 
        error: null 
      };
    } catch (error) {
      console.error('Unexpected error in signUp:', error);
      return { 
        user: null, 
        error: {
          message: error.message || 'An unexpected error occurred',
          code: error.code || 'unexpected_error'
        } 
      };
    }
  },

  // Get user by email
  async getUserByEmail(email) {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('email', email)
        .maybeSingle(); // Use maybeSingle instead of single to return null instead of throwing when no rows

      if (error) {
        console.error('Supabase error in getUserByEmail:', error);
        throw error;
      }
      
      return { data, error: null };
    } catch (error) {
      console.error('Error in getUserByEmail:', error);
      return { data: null, error };
    }
  },

  // Get user by ID
  async getUserById(userId) {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 is "No rows returned"
        throw error;
      }
      return { data, error };
    } catch (error) {
      console.error('Error getting user by ID:', error);
      return { data: null, error };
    }
  },

  // Update user profile
  async updateUser(userId, updateData) {
    try {
      const { data, error } = await supabase
        .from('users')
        .update({
          ...updateData,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId)
        .select()
        .single();

      if (error) {
        console.error('Error updating user:', error);
        throw error;
      }
      return { data, error: null };
    } catch (error) {
      console.error('Error in updateUser:', error);
      return { data: null, error };
    }
  }
};

module.exports = { 
  supabase, 
  donationService, 
  userService 
};
