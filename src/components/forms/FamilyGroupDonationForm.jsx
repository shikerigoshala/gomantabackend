import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import DonationFormBase from './DonationFormBase';
import { userService } from '../../services/supabase';
import { sendAccountCreationEmail } from '../../services/emailjs';
import { toast } from 'react-hot-toast';
import { loadRazorpay } from './IndividualDonationForm';

const FamilyGroupDonationForm = () => {
  const navigate = useNavigate();
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
    try {
      setIsProcessing(true);
      setError(null);
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

            // Generate a random password for the user
            const generatedPassword = Math.random().toString(36).slice(-8);
            
            const { data } = await userService.signUp(formData.email, generatedPassword, userData);

            if (data && data.user) {
              localStorage.setItem('supabase.auth.token', data.session?.access_token || '');
              // eslint-disable-next-line no-unused-vars
              userId = data.user.id;
              
              // Send account creation email with credentials
              try {
                const emailResult = await sendAccountCreationEmail(userData, generatedPassword);
                
                if (emailResult.success) {
                  toast.success('Account created successfully! Check your email for login details.');
                  // Display credentials in a toast for testing purposes
                  toast((
                    <div>
                      <p><strong>Your login credentials:</strong></p>
                      <p>Username: {userData.email}</p>
                      <p>Password: {generatedPassword}</p>
                    </div>
                  ), {
                    duration: 10000, // Show for 10 seconds
                    style: {
                      background: '#10b981',
                      color: 'white',
                      padding: '16px',
                    }
                  });
                } else {
                  toast.success('Account created successfully!');
                  console.warn('Email sending reported success but may have failed:', emailResult.error);
                }
              } catch (emailError) {
                console.error('Error sending account email:', emailError);
                // Continue with donation even if email fails
                toast.success('Account created successfully!');
              }
            }
          }
        } catch (authError) {
          console.error('Auth error:', authError);
          toast.error('Error with authentication. Continuing as guest.');
        }
      }

      // Create donation and initialize Razorpay payment
      try {
        // Calculate amount for all members (primary + additional)
        const calculateAmount = (familyMembers = []) => {
          // Filter out any empty member entries
          const validMembers = familyMembers?.filter(member => member?.name?.trim()) || [];
          // Count only valid members (including primary)
          const memberCount = Math.max(1, validMembers.length); // At least 1 member (primary)
          return memberCount * 365; // ₹365 per member
        };
        
        const amountInRupees = calculateAmount(formData.familyMembers);
        const memberCount = Math.max(1, formData.familyMembers?.filter(m => m?.name?.trim())?.length || 1);
        console.log('Amount in rupees:', amountInRupees, 'for member count:', memberCount);

        console.log('Sending to server - amount in rupees:', amountInRupees);
        
        // Create donation and get Razorpay order
        const response = await fetch('https://gomantabackend.onrender.com/api/donations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            amount: amountInRupees, // Send amount in rupees, let server convert to paise
            donorInfo: {
              name: formData.name,
              email: formData.email.toLowerCase(),
              phone: formData.phone,
              pan: formData.pan,
              address: formData.address,
              city: formData.city,
              state: formData.state,
              pincode: formData.pincode
            },
            familyInfo: {
              family_members: formData.familyMembers ? formData.familyMembers.map(member => ({
                name: member.name,
                age: parseInt(member.age) || 0,
                relation: member.relation
              })) : []
            },
            donationType: 'Family Group Donation'
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
        console.log('Form data family members:', formData.familyMembers);
        console.log('Total members count (including primary):', memberCount);
        
        // Use the correct Razorpay key
        const key = 'rzp_live_1newjMgO58r6X3';
        console.log('Using Razorpay key:', key);
        console.log('Amount in rupees being sent to server:', amountInRupees);
        
        // Make sure we have the order ID and our amount is valid
        if (!order.orderId) {
          console.error('No order ID received:', order);
          throw new Error('No payment order ID received from server');
        }
        
        if (!amountInRupees || isNaN(amountInRupees) || amountInRupees <= 0) {
          console.error('Invalid amount calculated:', amountInRupees);
          throw new Error('Invalid donation amount');
        }
        
        // Get the amount from the server response (in paise)
        const finalAmount = order.amount;
        console.log('Using amount from server (in paise):', finalAmount);
        
        // Initialize Razorpay options with the amount from server
        const options = {
          key: key,
          amount: finalAmount.toString(), // Use amount in paise from server
          currency: order.currency || 'INR',
          name: 'Gavshala Donation',
          description: `Family Donation (${memberCount} ${memberCount === 1 ? 'member' : 'members'})`,
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
              
              // Store donation ID in session storage
              sessionStorage.setItem('currentDonationId', donationId);
              
              // Redirect to thank you page
              navigate('/thank-you');
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
            donationType: 'Family Group Donation'
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
      } catch (donationError) {
        console.error('Donation error:', donationError);
        setError(donationError.message || 'Error processing donation. Please try again.');
        toast.error(donationError.message || 'Error processing donation. Please try again.');
      }
    } catch (error) {
      console.error('Donation error:', error);
      setError(error.message || 'Error processing donation');
      toast.error(error.message || 'Error processing donation');
    } finally {
      setIsProcessing(false);
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
              Create an account on the site to see and manage donation history. Login details will be sent to your email.
            </div>
          </span>
        </span>
      </label>

    </div>
  );

  return (
    <DonationFormBase
      title="Family Group Donation"
      amount={365} // Default to 1 member (₹365)
      donationType="Family Group Donation"
      description="Support our cows with your entire family. Add family members to include in your donation (₹365 per member)."
      onSubmit={handleDonationSubmit}
      isProcessing={isProcessing}
      error={error}
      customFormElements={customFormElements}
      additionalFields={[
        { name: 'createAccount', type: 'hidden', value: createAccount },
        { name: 'calculatedAmount', type: 'hidden', value: '36500' } // 36500 paise = ₹365
      ]}
      allowFamilyMembers={true}
    />
  );
};

export default FamilyGroupDonationForm;
