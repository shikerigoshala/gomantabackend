const { supabase, supabaseAdmin } = require('../config/supabase');

// Log Supabase client status
console.log('Supabase service initialized');
console.log('- Supabase URL:', supabase ? 'Connected' : 'Not connected');
console.log('- Supabase Admin:', supabaseAdmin ? 'Connected' : 'Not connected');

/**
 * Test the Supabase connection
 * @returns {Promise<boolean>} True if connection is successful
 */
const testConnection = async () => {
  try {
    const { error } = await supabase
      .from('profiles')
      .select('*')
      .limit(1);
      
    if (error) {
      console.error('Supabase connection test failed:', error);
      return false;
    }
    
    console.log('✅ Successfully connected to Supabase');
    return true;
  } catch (error) {
    console.error('Error testing Supabase connection:', error);
    return false;
  }
};

/**
 * Helper: Map DB donation (snake_case) to JS (camelCase)
 */
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

  /**
   * Create a new donation
   */
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
  
  // ... rest of the donation service methods ...
};

// User service
const userService = {
  /**
   * Sign up a new user
   */
  async signUp(email, password, userData) {
    try {
      console.log('Starting user sign up for:', email);
      
      // Use admin client for user creation to bypass RLS
      if (!supabaseAdmin) {
        throw new Error('Admin client not available. Service role key might be missing.');
      }

      // First create auth user using admin client
      const { data: authData, error: signUpError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true, // Auto-confirm the email
        user_metadata: {
          first_name: userData.firstName,
          last_name: userData.lastName,
          phone: userData.phone,
          user_type: userData.userType || 'donor'
        }
      });

      if (signUpError) {
        console.error('Auth user creation failed:', signUpError);
        throw signUpError;
      }
      
      console.log('Auth user created:', authData.user.id);
      
      // Then create user profile using admin client
      const profileData = {
        id: authData.user.id,
        email,
        first_name: userData.firstName,
        last_name: userData.lastName,
        phone: userData.phone,
        user_type: userData.userType || 'donor',
        created_at: new Date().toISOString()
      };

      console.log('Creating profile with data:', JSON.stringify(profileData, null, 2));
      
      const { data: insertedProfile, error: profileError } = await supabaseAdmin
        .from('profiles')
        .insert(profileData)
        .select();

      if (profileError) {
        console.error('Profile creation failed:', profileError);
        throw profileError;
      }

      console.log('Profile created successfully');
      
      return {
        user: authData.user,
        profile: insertedProfile ? insertedProfile[0] : null
      };
    } catch (error) {
      console.error('Error in user sign up:', error);
      throw error;
    }
  },

  // ... rest of the user service methods ...
};

// Run connection test on startup
if (process.env.NODE_ENV !== 'test') {
  testConnection().then(success => {
    if (!success) {
      console.error('⚠️  Failed to connect to Supabase. Some features may not work.');
    }
  });
}

// Export everything needed by other modules
module.exports = {
  supabase,
  supabaseAdmin,
  testConnection,
  donationService,
  userService,
  mapDonationFromDb
};
