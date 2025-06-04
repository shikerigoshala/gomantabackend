import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import DonationFormBase from './DonationFormBase';
import { donationService, userService } from '../../services/supabase';
import { toast } from 'react-hot-toast';

const AdoptCalfForm = () => {
  const amount = 11000;
  const navigate = useNavigate();
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
          type: 'adopt-calf',
          amount: amount,
          donor_info: {
            name: formData.name,
            email: formData.email.toLowerCase(),
            phone: formData.phone,
            pan: formData.pan,
            address: formData.address,
            city: formData.city,
            state: formData.state,
            pincode: formData.pincode,
            adoption_type: 'calf'
          },
          status: 'completed', // Mark as completed since we're not using external payment
          payment_id: `DIRECT-${Date.now()}`
        };
        
        // Save to Supabase
        const donation = await donationService.createDonation(supabaseDonationData);
        
        // Show success message
        toast.success('Calf adoption processed successfully!');
        
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

  // Additional fields for Adopt a Calf
  const adoptCalfFields = [
    {
      name: 'createAccount',
      type: 'hidden',
      value: createAccount
    }
  ];

  return (
    <DonationFormBase
      title="Adopt a Calf"
      amount={amount}
      donationType="Adopt Calf"
      description="Support a calf's care and growth. You'll receive regular updates about your calf."
      onSubmit={handleSubmit}
      isProcessing={isProcessing}
      customFormElements={customFormElements}
      additionalFields={adoptCalfFields}
    />
  );
};

export default AdoptCalfForm;
