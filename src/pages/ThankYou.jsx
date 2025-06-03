import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import axios from 'axios';

const API_BASE_URL = process.env.NODE_ENV === 'production'
  ? 'https://phonepe-donation-server.onrender.com'
  : 'http://localhost:3001';

const ThankYou = () => {
  const [paymentStatus, setPaymentStatus] = useState('pending');
  const [donation, setDonation] = useState(null);
  const location = useLocation();
  const navigate = useNavigate();
  const queryParams = new URLSearchParams(location.search);
  const transactionId = queryParams.get('txnId');
  const merchantId = queryParams.get('merchantId');
  const status = queryParams.get('status');
  const message = queryParams.get('message');

  console.log('ThankYou page params:', { transactionId, merchantId, status, message });

  useEffect(() => {
    let retryCount = 0;
    const maxRetries = 3;
    const retryDelay = 3000; // 3 seconds

    const verifyPayment = async () => {
      try {
        console.log('Payment callback params:', { transactionId, merchantId, status, message });

        // Get donation ID from session storage
        const donationId = sessionStorage.getItem('currentDonationId');
        if (!donationId) {
          console.error('No donation ID found in session');
          setPaymentStatus('failed');
          toast.error('Payment verification failed: No donation ID found');
          return;
        }

        // Check payment status
        const response = await axios.get(`${API_BASE_URL}https://gomantabackend.onrender.com/api/donations/check-status/${donationId}`);
        console.log('Payment verification response:', response.data);

        if (!response.data.success) {
          throw new Error(response.data.message || 'Payment verification failed');
        }

        const paymentData = response.data;

        switch (paymentData.state) {
          case 'SUCCESS':
            setPaymentStatus('success');
            setDonation({
              amount: paymentData.amount,
              payment_id: paymentData.payment?.transactionId || donationId
            });
            toast.success('Donation processed successfully!');
            break;

          case 'PENDING':
            if (retryCount < maxRetries) {
              retryCount++;
              console.log(`Payment still pending. Retrying (${retryCount}/${maxRetries})...`);
              setTimeout(verifyPayment, retryDelay);
            } else {
              setPaymentStatus('pending');
              toast.warning('Payment is still being processed. Please check your email for confirmation.');
            }
            break;

          case 'FAILED':
          case 'ERROR':
            setPaymentStatus('failed');
            toast.error(paymentData.statusMessage || 'Payment failed. Please try again.');
            break;

          default:
            setPaymentStatus('failed');
            toast.error('Unknown payment status. Please contact support.');
        }
      } catch (error) {
        console.error('Error verifying payment:', error);
        if (retryCount < maxRetries) {
          retryCount++;
          console.log(`Retrying after error (${retryCount}/${maxRetries})...`);
          setTimeout(verifyPayment, retryDelay);
        } else {
          setPaymentStatus('failed');
          toast.error(error.message || 'Unable to verify payment. Please contact support.');
        }
      }
    };

    // Start verification
    verifyPayment();

    // Cleanup function
    return () => {
      retryCount = maxRetries; // Stop any pending retries
    };
  }, [transactionId, merchantId, status, message]);


  return (
    <div className="min-h-screen bg-gray-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="text-center">
          <h2 className="text-3xl font-extrabold text-gray-900 sm:text-4xl">
            Thank You for Your Donation
          </h2>
          <div className="mt-8">
            {paymentStatus === 'pending' && (
              <div className="text-yellow-600">
                <p>Verifying your payment...</p>
              </div>
            )}
            {paymentStatus === 'success' && (
              <div className="text-green-600">
                <p>Your payment was successful!</p>
                {donation && (
                  <div className="mt-4">
                    <p className="text-lg font-medium">Amount: ₹{donation.amount}</p>
                    <p className="text-lg">Transaction ID: {donation.payment_id}</p>
                  </div>
                )}
              </div>
            )}
            {paymentStatus === 'failed' && (
              <div className="text-red-600">
                <p>Payment failed. Please try again.</p>
              </div>
            )}
          </div>
          <div className="mt-8 flex justify-center space-x-4">
            <button
              onClick={() => navigate('/')}
              className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700"
            >
              Return Home
            </button>
            <button
              onClick={() => navigate('/donate')}
              className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-emerald-600 hover:bg-emerald-700"
            >
              Donate Again
            </button>
          </div>
        </div>

        <div className="text-center mt-6">
          <p className="text-sm text-gray-500">
            If you have any questions, please contact our support team at{' '}
            <a href="mailto:support@example.com" className="text-emerald-500 hover:underline">
              support@example.com
            </a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default ThankYou;
