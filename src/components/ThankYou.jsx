import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { donationService } from '../services/supabase';
import { toast } from 'react-hot-toast';

const ThankYou = () => {
  const [donation, setDonation] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDonation = async () => {
      try {
        const donationId = sessionStorage.getItem('currentDonationId');
        if (donationId) {
          const donationData = await donationService.getDonationById(donationId);
          setDonation(donationData);
        }
      } catch (error) {
        console.error('Error fetching donation:', error);
        toast.error('Could not retrieve donation details');
      } finally {
        setLoading(false);
      }
    };

    fetchDonation();
  }, []);

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <div className="bg-white rounded-lg shadow-lg p-8 text-center">
        <div className="mb-6">
          <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
        </div>
        
        <h1 className="text-3xl font-bold text-gray-800 mb-4">Thank You for Your Donation!</h1>
        <p className="text-lg text-gray-600 mb-8">Your generous contribution will make a real difference.</p>
        
        {loading ? (
          <div className="animate-pulse flex justify-center">
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
        ) : donation ? (
          <div className="bg-gray-50 p-6 rounded-lg mb-8">
            <h2 className="text-xl font-semibold mb-4">Donation Details</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left">
              <div>
                <p className="text-gray-500">Donation Type</p>
                <p className="font-medium">{donation.type.charAt(0).toUpperCase() + donation.type.slice(1)} Donation</p>
              </div>
              <div>
                <p className="text-gray-500">Amount</p>
                <p className="font-medium">₹{donation.amount}</p>
              </div>
              <div>
                <p className="text-gray-500">Date</p>
                <p className="font-medium">{new Date(donation.createdAt).toLocaleDateString()}</p>
              </div>
              <div>
                <p className="text-gray-500">Transaction ID</p>
                <p className="font-medium">{donation.paymentId}</p>
              </div>
            </div>
          </div>
        ) : (
          <p className="text-gray-500 mb-8">No donation details available</p>
        )}
        
        <div className="flex flex-col md:flex-row gap-4 justify-center">
          <Link to="/" className="px-6 py-3 bg-emerald-600 text-white rounded-md hover:bg-emerald-700 transition">
            Return Home
          </Link>
          <Link to="/donations" className="px-6 py-3 border border-emerald-600 text-emerald-600 rounded-md hover:bg-emerald-50 transition">
            View All Donations
          </Link>
        </div>
      </div>
    </div>
  );
};

export default ThankYou;
