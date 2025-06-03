import React, { useState, useEffect } from 'react';
import { userService } from '../../services/supabase';
import DonationFormBase from './DonationFormBase';
import { sendAccountCreationEmail } from '../../services/emailjs';
import { toast } from 'react-hot-toast';

export const loadRazorpay = () => {
  return new Promise((resolve) => {
    if (window.Razorpay) {
      resolve(window.Razorpay);
      return;
    }
    
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = () => {
      console.log('Razorpay script loaded successfully');
      resolve(window.Razorpay);
    };
    script.onerror = () => {
      console.error('Failed to load Razorpay script');
      resolve(null);
    };
    document.body.appendChild(script);
  });
};

const IndividualDonationForm = () => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [createAccount, setCreateAccount] = useState(true);
  const [error, setError] = useState(null);
  
  // Preload Razorpay script when component mounts
  useEffect(() => {
    loadRazorpay().then(Razorpay => {
      if (Razorpay) {
        console.log('Razorpay SDK loaded on component mount');
      }
    });
  }, []);

  const handleDonationSubmit = async (formData) => {
    setIsProcessing(true);
    setError(null);
    
    try {
      // Create account if checkbox is checked
      if (createAccount) {
        await handleAccountCreation(formData);
      }

      // Create donation and get Razorpay order
      const response = await fetch('https://gomantabackend.onrender.com/api/donations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: formData.amount,
          donorInfo: {
            name: formData.name,
            email: formData.email,
            phone: formData.phone,
            address: formData.address || '',
            city: formData.city || '',
            state: formData.state || '',
            pincode: formData.pincode || '',
            pan: formData.pan || ''
          },
          donationType: 'Individual Donation'
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create donation');
      }

      const data = await response.json();
      console.log('Donation created successfully:', data);
      const { order, donationId } = data;

      // Initialize Razorpay
      const Razorpay = await loadRazorpay();
      if (!Razorpay) {
        throw new Error('Failed to load payment gateway');
      }

      console.log('Razorpay order details:', order);
      
      // Use the correct Razorpay key from .env
      const key = 'rzp_live_1newjMgO58r6X3';
      console.log('Using Razorpay key:', key);
      
      // Make sure we have the order ID
      if (!order.orderId) {
        console.error('No order ID received:', order);
        throw new Error('No payment order ID received from server');
      }
      
      // Initialize Razorpay options
      const options = {
        key: key,
        amount: order.amount,
        currency: order.currency || 'INR',
        name: 'Gavshala Donation',
        description: 'Donation for cow welfare',
        order_id: order.orderId,
        handler: async (response) => {
          console.log('Payment successful:', response);
          try {
            // Verify payment
            const verifyResponse = await fetch('https://gomantabackend.onrender.com/api/donations/verify', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                paymentId: response.razorpay_payment_id,
                orderId: response.razorpay_order_id,
                donationId
              })
            });
            
            if (!verifyResponse.ok) {
              throw new Error('Payment verification failed');
            }
            
            toast.success('Payment successful! Thank you for your donation.');
          } catch (error) {
            console.error('Payment verification error:', error);
            toast.error('Payment verification failed. Please contact support.');
          }
        },
        prefill: {
          name: formData.name,
          email: formData.email,
          contact: formData.phone
        },
        theme: {
          color: '#10b981' // emerald-500
        },
        modal: {
          ondismiss: function() {
            console.log('Payment modal dismissed');
            setIsProcessing(false);
          }
        },
        notes: {
          donationId: donationId,
          donationType: 'Individual Donation'
        }
      };

      // Create and open Razorpay checkout
      try {
        console.log('Opening Razorpay checkout with options:', options);
        const rzpInstance = new Razorpay(options);
        rzpInstance.on('payment.failed', function (response) {
          console.error('Payment failed:', response.error);
          toast.error(`Payment failed: ${response.error.description}`);
          setIsProcessing(false);
        });
        rzpInstance.open();
        console.log('Razorpay checkout opened');
      } catch (rzpError) {
        console.error('Error opening Razorpay:', rzpError);
        throw new Error(`Failed to open payment: ${rzpError.message}`);
      }
      
    } catch (error) {
      setError(error.message || 'Payment processing failed');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleAccountCreation = async (formData) => {
    try {
      // Check if user exists
      const existingUser = await userService.getUserByEmail(formData.email);
      
      if (existingUser) {
        const { session } = await userService.signIn(formData.email, formData.phone);
        if (session) {
          localStorage.setItem('supabase.auth.token', session.access_token);
          toast.success('Signed in successfully!');
        }
        return;
      }

      // Create new user
      const userData = {
        name: formData.name,
        email: formData.email.toLowerCase(),
        phone: formData.phone
      };
      
      const generatedPassword = Math.random().toString(36).slice(-8);
      const { data } = await userService.signUp(formData.email, generatedPassword, userData);
      
      if (data?.user) {
        localStorage.setItem('supabase.auth.token', data.session?.access_token || '');
        await sendAccountCreationEmail(userData, generatedPassword);
        toast.success('Account created! Check your email for login details.');
      }
    } catch (error) {
      console.error('Account creation error:', error);
      toast.error('Account creation failed. Continuing as guest.');
    }
  };

  // Custom form elements to add to DonationFormBase
  const customFormElements = (
    <div className="col-span-2">
      <label className="flex items-center space-x-2 cursor-pointer group relative">
        <input
          type="checkbox"
          checked={createAccount}
          onChange={() => setCreateAccount(!createAccount)}
          className="form-checkbox h-4 w-4 text-emerald-600 focus:ring-emerald-500 border-gray-300 rounded"
        />
        <span className="text-sm text-gray-700 flex items-center space-x-1">
          <span>Create an account</span>
          <span className="relative">
            <span className="ml-1 text-xs font-bold text-emerald-600 border border-emerald-600 rounded-full px-1.5 cursor-default">
              ?
            </span>
            <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 w-max max-w-xs bg-gray-800 text-white text-xs rounded px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
              Create an account to track your donations and receive updates.
            </div>
          </span>
        </span>
      </label>
    </div>
  );

  return (
    <DonationFormBase
      title="Individual Donation"
      amount={365}
      donationType="Individual Donation"
      onSubmit={handleDonationSubmit}
      isProcessing={isProcessing}
      error={error}
      customFormElements={customFormElements}
      additionalFields={[{ name: 'createAccount', type: 'hidden', value: createAccount }]}
    />
  );
};

export default IndividualDonationForm;
