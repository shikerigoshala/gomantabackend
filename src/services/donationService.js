import axios from 'axios';

<<<<<<< HEAD
// Donations API URL: relative in dev (proxy), absolute in production
const API_URL =
  process.env.NODE_ENV === 'production'
    ? `${process.env.REACT_APP_API_URL}https://gomantabackend.onrender.com/api/donations`
    : 'https://gomantabackend.onrender.com/api/donations';
=======
// Base API URL from environment variables
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';
const DONATIONS_ENDPOINT = `${API_URL}/donations`;
>>>>>>> 711a1b8b1ec2ca9e8bffac396c8c72d1093f12d3

// Log the API configuration
console.log('API Configuration:', {
  API_URL,
<<<<<<< HEAD
=======
  DONATIONS_ENDPOINT,
>>>>>>> 711a1b8b1ec2ca9e8bffac396c8c72d1093f12d3
  NODE_ENV: process.env.NODE_ENV
});

const donationService = {
  // Create a new donation
  async createDonation(donationData) {
    try {
      const response = await axios.post(API_URL, donationData, {
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });
      
      // Log the full response for debugging
      console.log('Server response:', response.data);

      // Validate payment URL in response
      if (response.data && response.data.paymentUrl) {
        // Log payment URL explicitly for debugging
        console.log('PAYMENT URL RECEIVED:', response.data.paymentUrl);
        // Use assign for robust redirect
        window.location.assign(response.data.paymentUrl);
        return {
          ...response.data,
          donation: {
            ...response.data.donation,
            payment_url: response.data.paymentUrl // Ensure payment_url is set
          }
        };
      } else {
        // Detailed error if payment URL missing
        const errMsg =
          'Payment URL not received from server! Full response: ' +
          JSON.stringify(response.data);
        console.error(errMsg);
        alert(errMsg);
        throw new Error(errMsg);
      }
    } catch (error) {
      // More detailed error logging
      let backendMsg = error.response?.data?.message || error.message;
      let details = error.response ? JSON.stringify(error.response.data) : '';
      console.error('Error creating donation:', {
        message: backendMsg,
        details: details,
        status: error.response?.status
      });
      alert('Error creating donation: ' + backendMsg + (details ? '\nDetails: ' + details : ''));
      throw backendMsg;
    }
  },

  // Create an individual donation
  async createIndividualDonation(donationData) {
    try {
      const response = await axios.post(`${API_URL}/individual`, donationData, {
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });
      return response.data;
    } catch (error) {
      console.error('Error creating individual donation:', error);
      throw error;
    }
  },

  // Create a family donation
  async createFamilyDonation(donationData) {
    try {
      const response = await axios.post(`${API_URL}/family`, donationData, {
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });
      return response.data;
    } catch (error) {
      console.error('Error creating family donation:', error);
      throw error;
    }
  },

  // Get donation status
  async getDonationStatus(transactionId) {
    try {
      if (!transactionId) {
        throw new Error('Transaction ID is required');
      }

      // Use GET for payment status with retry
      const maxRetries = 3;
      let lastError;

      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          console.log(`Checking payment status (attempt ${attempt}/${maxRetries}):`, transactionId);
          
          const response = await axios.get(`${API_URL}/payment-status/${transactionId}`, {
            headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/json'
            }
          });

          // Log the response for debugging
          console.log('Payment status response:', response.data);
          
          // Check for redirect with status
          if (response.request?.responseURL?.includes('status=')) {
            const url = new URL(response.request.responseURL);
            const status = url.searchParams.get('status');
            const message = url.searchParams.get('message');
            
            console.log('Payment status from URL:', { status, message });
            
            return {
              status: status === 'success' ? 'completed' : status,
              message: message || '',
              donation: response.data?.donation
            };
          }

          // Handle normal response
          const result = {
            status: response.data.status || 'pending',
            message: response.data.message || '',
            donation: response.data.donation
          };

          console.log('Payment status result:', result);
          return result;

        } catch (err) {
          console.warn(`Payment status check attempt ${attempt} failed:`, {
            message: err.message,
            response: err.response?.data
          });
          
          lastError = err;
          
          if (attempt < maxRetries) {
            const delay = 1000 * attempt;
            console.log(`Retrying in ${delay}ms...`);
            await new Promise(resolve => setTimeout(resolve, delay));
          }
        }
      }

      throw lastError;
    } catch (error) {
      console.error('Error getting donation status:', {
        message: error.message,
        response: error.response?.data
      });
      throw error;
    }
  },

  // Get all donations for the current user
  async getUserDonations() {
    try {
<<<<<<< HEAD
      const response = await axios.get(API_URL);
=======
      const response = await axios.get(DONATIONS_ENDPOINT);
>>>>>>> 711a1b8b1ec2ca9e8bffac396c8c72d1093f12d3
      return response.data;
    } catch (error) {
      console.error('Error getting user donations:', error);
      throw error;
    }
  },

  // Get a specific donation
  async getDonation(id) {
    try {
<<<<<<< HEAD
      const response = await axios.get(`${API_URL}/${id}`);
=======
      const response = await axios.get(`${DONATIONS_ENDPOINT}/${id}`);
>>>>>>> 711a1b8b1ec2ca9e8bffac396c8c72d1093f12d3
      return response.data;
    } catch (error) {
      console.error('Error getting donation:', error);
      throw error;
    }
  }
};

export default donationService;
