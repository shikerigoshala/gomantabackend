import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import DonationFormBase from './DonationFormBase';
import { donationService, userService } from '../../services/supabase';
import { toast } from 'react-hot-toast';

const FIXED_AMOUNTS = {
  premium: 36500,
  standard: 18500
};

const AdoptCowForm = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const isPremium = location.pathname.includes('premium');
  const [isProcessing, setIsProcessing] = useState(false);
  const [createAccount, setCreateAccount] = useState(true);

  const handleSubmit = async (formData) => {
    setIsProcessing(true);
    try {
      let userId = 'GUEST';
      
      // Create account if checkbox is checked
      if (createAccount) {
        try {
          // Check if user already exists
          const existingUser = await userService.getUserByEmail(formData.email);
          
          if (existingUser) {
            // User exists, try to sign in
            const { user, session } = await userService.signIn(formData.email, formData.phone);
            if (session) {
              localStorage.setItem('supabase.auth.token', session.access_token);
              userId = user.id;
              toast.success('Signed in successfully!');
            }
          } else {
            // Create new user
            const userData = {
              name: formData.name,
              email: formData.email.toLowerCase(),
              phone: formData.phone,
              address: formData.address,
              city: formData.city,
              state: formData.state,
              pincode: formData.pincode,
              pan: formData.pan
            };
            
            const { user, session } = await userService.signUp(formData.email, formData.phone, userData);
            
            if (session) {
              localStorage.setItem('supabase.auth.token', session.access_token);
              userId = user.id;
              toast.success('Account created successfully!');
            }
          }
        } catch (authError) {
          console.error('Auth error:', authError);
          toast.error('Error with authentication. Continuing as guest.');
        }
      }

      // Create donation directly in Supabase
      try {
        // Prepare donation data
        const supabaseDonationData = {
          user_id: userId,
          type: isPremium ? 'adopt-cow-premium' : 'adopt-cow-standard',
          amount: FIXED_AMOUNTS[isPremium ? 'premium' : 'standard'],
          donor_info: {
            name: formData.name,
            email: formData.email.toLowerCase(),
            phone: formData.phone,
            pan: formData.pan,
            address: formData.address,
            city: formData.city,
            state: formData.state,
            pincode: formData.pincode,
            adoption_plan: isPremium ? 'premium' : 'standard'
          },
          status: 'completed', // Mark as completed since we're not using external payment
          payment_id: `DIRECT-${Date.now()}`
        };
        
        // Save to Supabase
        const donation = await donationService.createDonation(supabaseDonationData);
        
        // Show success message
        toast.success('Cow adoption processed successfully!');
        
        // Store donation ID in session storage
        sessionStorage.setItem('currentDonationId', donation.id);
        
        // Redirect to thank you page
        navigate('/thank-you');
      } catch (donationError) {
        console.error('Donation error:', donationError);
        toast.error('Error processing adoption. Please try again.');
      }
    } catch (error) {
      console.error('Error processing adoption:', error);
      toast.error('Error processing adoption');
    } finally {
      setIsProcessing(false);
    }
  };
  
  // Custom form elements to add to DonationFormBase
  const customFormElements = (
    <div className="col-span-2">
      <label className="flex items-center space-x-2 cursor-pointer">
        <input
          type="checkbox"
          checked={createAccount}
          onChange={() => setCreateAccount(!createAccount)}
          className="form-checkbox h-4 w-4 text-emerald-600 focus:ring-emerald-500 border-gray-300 rounded"
        />
        <span className="text-sm text-gray-700">Create an account automatically</span>
      </label>
    </div>
  );

  // Additional fields for Adopt a Cow
  const adoptCowFields = [
    {
      name: 'createAccount',
      type: 'hidden',
      value: createAccount
    }
  ];

  return (
    <DonationFormBase
      title={`Adopt a Cow - ${isPremium ? 'Premium' : 'Standard'} Plan`}
      amount={FIXED_AMOUNTS[isPremium ? 'premium' : 'standard']}
      donationType={isPremium ? 'Adopt a Cow Premium' : 'Adopt a Cow Standard'}
      description={isPremium ? 'Premium plan includes personalized updates and a certificate' : 'Standard plan includes regular updates about your cow'}
      onSubmit={handleSubmit}
      isProcessing={isProcessing}
      customFormElements={customFormElements}
      additionalFields={adoptCowFields}
    />
  );
};

export default AdoptCowForm;
