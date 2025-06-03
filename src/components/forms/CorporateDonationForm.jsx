import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import DonationFormBase from './DonationFormBase';
import { donationAPI, authAPI } from '../../services/api';
import { toast } from 'react-hot-toast';

const CorporateDonationForm = () => {
  const navigate = useNavigate();
  const [isProcessing, setIsProcessing] = useState(false);

  const handleDonationSubmit = async (formData) => {
    try {
      setIsProcessing(true);
      
      // First, try to register/login the user
      try {
        const authResponse = await authAPI.signup({
          name: `${formData.firstName} ${formData.lastName}`.trim(),
          email: formData.emailAddress,
          address: `${formData.address1} ${formData.address2}`.trim(),
          city: formData.city,
          state: formData.state,
          pincode: formData.zipCode,
          pan: formData.taxNumber,
          dateOfBirth: formData.dateOfBirth,
          companyName: formData.companyName,
          companyRegistrationNumber: formData.companyRegistrationNumber,
          designation: formData.designation
        });

        // If registration fails (user exists), try logging in
        if (!authResponse.success) {
          const loginResponse = await authAPI.login({
            email: formData.emailAddress,
            password: formData.phoneNumber
          });
          if (loginResponse.token) {
            localStorage.setItem('token', loginResponse.token);
          }
        } else {
          // If registration successful, log them in
          const loginResponse = await authAPI.login({
            email: formData.emailAddress,
            password: formData.phoneNumber
          });
          if (loginResponse.token) {
            localStorage.setItem('token', loginResponse.token);
          }
        }

        // Create donation record
        const response = await donationAPI.createCorporateDonation({
          amount: formData.amount,
          donorInfo: {
            name: `${formData.firstName} ${formData.lastName}`.trim(),
            email: formData.emailAddress,
            address: `${formData.address1} ${formData.address2}`.trim(),
            city: formData.city,
            state: formData.state,
            pincode: formData.zipCode,
            pan: formData.taxNumber,
            dateOfBirth: formData.dateOfBirth,
            suggestedBy: formData.suggestedBy,
            willingness: formData.willingness,
            googleCoords: formData.googleCoords,
            companyName: formData.companyName,
            companyRegistrationNumber: formData.companyRegistrationNumber,
            designation: formData.designation
          }
        });
        
        // Redirect to PhonePe payment page
        if (response.paymentUrl) {
          sessionStorage.setItem('currentDonationId', response.donationId);
          window.location.href = response.paymentUrl;
        } else {
          toast.error('Error initiating payment. Please try again.');
        }
      } catch (authError) {
        console.error('Auth error:', authError);
        toast.error('Error with authentication. Please try again.');
      }
    } catch (error) {
      console.error('Donation error:', error);
      toast.error(error.response?.data?.message || 'Error processing donation');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <DonationFormBase
      title="Corporate Donation"
      donationType="Corporate Donation"
      onSubmit={handleDonationSubmit}
      isProcessing={isProcessing}
      additionalFields={[
        {
          name: 'companyName',
          label: 'Company Name',
          type: 'text',
          required: true
        },
        {
          name: 'companyRegistrationNumber',
          label: 'Company Registration Number',
          type: 'text',
          required: true
        },
        {
          name: 'designation',
          label: 'Your Designation',
          type: 'text',
          required: true
        }
      ]}
    />
  );
};

export default CorporateDonationForm;
