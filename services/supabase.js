const { createClient } = require('@supabase/supabase-js');

// Create a singleton Supabase client with lazy loading
let supabaseClient = null;

const getSupabaseClient = () => {
  if (!supabaseClient) {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Supabase URL and Key must be set in environment variables');
    }
    
    // Initialize Supabase client with optimized options for serverless
    supabaseClient = createClient(supabaseUrl, supabaseKey, {
      auth: {
        persistSession: false // Don't persist session in serverless environment
      }
    });
  }
  
  return supabaseClient;
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

module.exports = { supabase, donationService };
