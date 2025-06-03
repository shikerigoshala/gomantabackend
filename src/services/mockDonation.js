// Mock donation service for handling donations when Supabase is unavailable
export const mockDonationService = {
  // Create a new donation locally
  createDonation: async (donationData) => {
    try {
      console.log('Creating mock donation:', donationData);
      
      // Generate a mock donation ID
      const donationId = `MOCK-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      
      // Create a mock donation object
      const mockDonation = {
        id: donationId,
        ...donationData,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        status: 'completed'
      };
      
      // Store in localStorage for persistence
      const donations = JSON.parse(localStorage.getItem('mockDonations') || '[]');
      donations.push(mockDonation);
      localStorage.setItem('mockDonations', JSON.stringify(donations));
      
      console.log('Mock donation created successfully:', mockDonation);
      
      return mockDonation;
    } catch (error) {
      console.error('Error creating mock donation:', error);
      throw error;
    }
  },
  
  // Get all mock donations
  getDonations: () => {
    try {
      return JSON.parse(localStorage.getItem('mockDonations') || '[]');
    } catch (error) {
      console.error('Error getting mock donations:', error);
      return [];
    }
  }
};

export default mockDonationService;
