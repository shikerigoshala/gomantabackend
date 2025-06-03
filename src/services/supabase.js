import { createClient } from '@supabase/supabase-js';

// Supabase configuration
const SUPABASE_URL = 'https://xcdyletgoabaxznsthqj.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhjZHlsZXRnb2FiYXh6bnN0aHFqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQyNjMzMTgsImV4cCI6MjA1OTgzOTMxOH0.SSQfKfhXyLcLHUOJnnBXj1SJyKH2tGKKiuRoZ1SN_jI';

// Initialize Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Donation service
export const donationService = {
  // Get all donations for the current user
  async getUserDonations() {
    try {
      const { data, error } = await supabase
        .from('donations')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching donations:', error);
      return [];
    }
  },

  // Get donation by ID
  async getDonationById(id) {
    const { data, error } = await supabase
      .from('donations')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) throw error;
    return data;
  },

  // Create a new donation
  async createDonation(donationData) {
    const { data, error } = await supabase
      .from('donations')
      .insert([donationData])
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  // Update donation
  async updateDonation(id, updates) {
    const { data, error } = await supabase
      .from('donations')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
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
    if (!email) return null;
    
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('email', email.toLowerCase())
        .maybeSingle();
      
      if (error) {
        console.error('Error fetching user by email:', error);
        return null;
      }
      
      return data;
    } catch (error) {
      console.error('Exception in getUserByEmail:', error);
      return null;
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
