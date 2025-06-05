import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: new URL('../../.env', import.meta.url).pathname });

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

// Initialize Supabase client with anon key for public operations
const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
    detectSessionInUrl: false
  }
});

console.log('✅ Supabase client initialized successfully');

// Donation service
export const donationService = {
  // Get all donations for the current user
  async getUserDonations(userId) {
    try {
      const { data, error } = await supabase
        .from('donations')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error getting user donations:', error);
      throw error;
    }
  },

  // Get donation by ID
  async getDonationById(id) {
    try {
      const { data, error } = await supabase
        .from('donations')
        .select('*')
        .eq('id', id)
        .single();
      
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error getting donation by ID:', error);
      throw error;
    }
  },

  // Create a new donation
  async createDonation(donationData) {
    try {
      const { data, error } = await supabase
        .from('donations')
        .insert([donationData])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error creating donation:', error);
      throw error;
    }
  },

  // Update donation
  async updateDonation(id, updates) {
    try {
      const { data, error } = await supabase
        .from('donations')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error updating donation:', error);
      throw error;
    }
  }
};

// User service
export const userService = {
  // Get current user with profile
  async getCurrentUser() {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) return null;
    
    // Get the full user profile from the users table
    const { data: profile } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single();
    
    return { ...user, ...profile };
  },
  
  // Get user by email
  async getUserByEmail(email) {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('email', email)
        .single();
      
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error getting user by email:', error);
      throw error;
    }
  },

  // Create new user
  async createUser(userData) {
    try {
      const { data, error } = await supabase
        .from('users')
        .insert([userData])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error creating user:', error);
      throw error;
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
      
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error getting user by ID:', error);
      throw error;
    }
  },

  // Update user
  async updateUser(userId, updates) {
    try {
      const { data, error } = await supabase
        .from('users')
        .update(updates)
        .eq('id', userId)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error updating user:', error);
      throw error;
    }
  },

  // Sign in with email and password
  async signIn(email, password, userType = 'familyHead') {
    try {
      // First sign in with email/password
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password
      });
      
      if (authError) {
        console.error('Authentication error:', authError);
        throw authError;
      }
      
      if (!authData || !authData.user) {
        throw new Error('No user data returned from authentication');
      }
      
      // Then get the user's profile
      const { data: profileData, error: profileError } = await supabase
        .from('users')
        .select('*')
        .eq('id', authData.user.id)
        .single();
      
      if (profileError) {
        console.warn('Profile not found, creating default profile');
        // Create a default profile if it doesn't exist
        const { error: createError } = await supabase
          .from('users')
          .insert([{
            id: authData.user.id,
            email: authData.user.email,
            role: userType || 'default',
            is_active: true,
            created_at: new Date().toISOString()
          }])
          .select()
          .single();
        
        if (createError) {
          console.error('Error creating profile:', createError);
          throw new Error('Failed to create user profile');
        }
        
        // Get the newly created profile
        const { data: newProfile } = await supabase
          .from('users')
          .select('*')
          .eq('id', authData.user.id)
          .single();
          
        return { user: { ...authData.user, ...newProfile } };
      }
      
      // Return combined auth and profile data
      return { 
        user: { 
          ...authData.user, 
          ...profileData,
          user_type: userType 
        } 
      };
      
    } catch (err) {
      console.error('Sign in error:', err);
      throw err; // Re-throw to be handled by the caller
    }
  },

  // Sign up with email and password
  async signUp(email, password, userData) {
    try {
      const userType = userData.userType || 'familyHead';
      const isFamily = userType === 'familyHead';
      
      // First, sign up the user with Supabase Auth
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: userData.name,
            first_name: userData.firstName || '',
            last_name: userData.lastName || '',
            phone: userData.phone || '',
            user_type: userType,
            is_family: isFamily
          },
          emailRedirectTo: `${window.location.origin}/login`
        }
      });
      
      if (signUpError) {
        console.error('Auth signup error:', signUpError);
        return { data: null, error: signUpError };
      }
      
      if (!authData || !authData.user) {
        return { 
          data: null, 
          error: { message: 'User creation failed. Please try again.' } 
        };
      }
      
      console.log('Auth signup successful, user ID:', authData.user.id);
      
      // The trigger function should have created the user record
      // Let's wait a moment to ensure the trigger has time to execute
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Verify the user was created in the users table
      const { data: userRecord, error: userCheckError } = await supabase
        .from('users')
        .select('*')
        .eq('id', authData.user.id)
        .single();
      
      if (userCheckError || !userRecord) {
        console.log('User record not found, attempting to create manually');
        
        // Then create a user profile in the public.users table
        if (authData.user) {
          const { error: profileError } = await supabase
            .from('users')
            .insert({
              id: authData.user.id,
              email: email,
              name: userData.name,
              first_name: userData.firstName || null,
              last_name: userData.lastName || null,
              phone: userData.phone || null,
              user_type: userType,
              is_family: isFamily,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            });
          
          if (profileError) {
            console.error('Error inserting user data:', profileError);
            // Don't sign out - the auth user is created and the trigger might work later
            // Just log the error and continue
          }
        }
      }
      
      return { data: authData, error: null };
    } catch (error) {
      console.error('Signup process error:', error);
      return { data: null, error };
    }
  },

  // Sign out
  async signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    return true;
  },
  
  // Reset password
  async resetPassword(email) {
    const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin + '/reset-password',
    });
    
    if (error) throw error;
    return data;
  },
  
  // Resend confirmation email
  async resendConfirmation(email) {
    const { data, error } = await supabase.auth.resend({
      type: 'signup',
      email: email,
      options: {
        emailRedirectTo: window.location.origin + '/login'
      }
    });
    
    if (error) throw error;
    return { data, error: null };
  },

  // Update user profile
  async updateProfile(updates) {
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');
      
      // Update auth user metadata
      const { data: authData, error: authError } = await supabase.auth.updateUser({
        data: {
          name: updates.name,
          phone: updates.phone,
          address: updates.address,
          city: updates.city,
          state: updates.state,
          pincode: updates.pincode,
          country: updates.country
        }
      });
      
      if (authError) throw authError;
      
      // Update users table
      const { data: userData, error: userError } = await supabase
        .from('users')
        .update({
          name: updates.name,
          phone: updates.phone,
          address: updates.address,
          city: updates.city,
          state: updates.state,
          pincode: updates.pincode,
          country: updates.country,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id)
        .select()
        .single();
      
      if (userError) {
        console.error('Error updating users table:', userError);
        // Don't fail the whole operation if users table update fails
        // The auth update was successful, which is more critical
      }
      
      return { ...authData, ...userData };
    } catch (error) {
      console.error('Error in updateProfile:', error);
      throw error;
    }
  }
};

export default supabase;
