import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests if available
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});

// Handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
    }
    return Promise.reject(error);
  }
);

// Donation APIs
export const donationAPI = {
  // Create general donation (no auth required)
  createDonation: async (donationData) => {
    const response = await api.post('/donations', donationData);
    return response.data;
  },

  // Create individual donation (auth required)
  createIndividualDonation: async (donationData) => {
    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('Authentication required');
    }
    const response = await api.post('/donations/individual', donationData);
    return response.data;
  },

  // Create family donation (auth required)
  createFamilyDonation: async (donationData) => {
    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('Authentication required');
    }
    const response = await api.post('/donations/family', donationData);
    return response.data;
  },

  // Get all donations
  getDonations: async () => {
    const response = await api.get('/donations');
    return response.data;
  },

  // Get specific donation
  getDonation: async (id) => {
    const response = await api.get(`/donations/${id}`);
    return response.data;
  },

  // Update donation status
  updateDonationStatus: async (id, status, paymentId) => {
    const response = await api.patch(`/donations/${id}/status`, { status, paymentId });
    return response.data;
  },

  // Get donation status
  getDonationStatus: async (txnId) => {
    const response = await api.get(`/donations/status/${txnId}`);
    return response.data;
  },

  // Get donation history for the current user
  getDonationHistory: async () => {
    const response = await api.get('/donations');
    return response.data;
  }
};

// Auth APIs
export const authAPI = {
  // Clear any existing auth state
  clearAuth: () => {
    localStorage.removeItem('token');
  },

  login: async (credentials) => {
    // Clear any existing auth state first
    authAPI.clearAuth();

    // Ensure email and password are provided
    if (!credentials.email || !credentials.password) {
      throw new Error('Email and password are required');
    }

    const response = await api.post('/auth/login', credentials);
    if (response.data.token) {
      localStorage.setItem('token', response.data.token);
    }
    return response.data;
  },

  signup: async (userData) => {
    // Clear any existing auth state first
    authAPI.clearAuth();

    // Ensure password is provided
    if (!userData.password) {
      throw new Error('Password is required');
    }

    const response = await api.post('/auth/signup', userData);
    if (response.data.token) {
      localStorage.setItem('token', response.data.token);
    }
    return response.data;
  },

  getProfile: async () => {
    const response = await api.get('/auth/profile');
    return response.data;
  }
};
