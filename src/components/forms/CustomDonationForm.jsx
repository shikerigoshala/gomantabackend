import React, { useState } from 'react';
import { useLocation } from 'react-router-dom';
import DonationFormBase from './DonationFormBase';
import { donationAPI } from '../../services/api';

const CustomDonationForm = () => {
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const amount = parseInt(searchParams.get('amount')) || 100;
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSubmit = async (formData) => {
    setIsProcessing(true);
    try {
      const donationData = {
        amount,
        donationType: 'Custom',
        donorInfo: {
          ...formData
        }
      };

      const response = await donationAPI.createDonation(donationData);
      if (response.paymentUrl) {
        window.location.href = response.paymentUrl;
      } else {
        window.toast && window.toast.error && window.toast.error(
          response.message || 'Error initiating payment. Please try again.'
        );
      }
    } catch (error) {
      console.error('Error processing donation:', error);
      window.toast && window.toast.error && window.toast.error(
        error.response?.data?.message || error.message || 'Error processing donation.'
      );
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <DonationFormBase
      title="Custom Donation"
      amount={amount}
      donationType="Custom"
      onSubmit={handleSubmit}
      isProcessing={isProcessing}
    />
  );
};

export default CustomDonationForm;
