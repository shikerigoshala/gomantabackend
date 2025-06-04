import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-hot-toast';

const PaymentStatus = () => {
  const [status, setStatus] = useState('processing');
  const [error, setError] = useState(null);
  const location = useLocation();
  const navigate = useNavigate();
  const queryParams = new URLSearchParams(location.search);
  const txnId = queryParams.get('txnId');

  useEffect(() => {
    const verifyPayment = async () => {
      try {
        // Wait for 2 seconds to allow the payment to be processed
        await new Promise(resolve => setTimeout(resolve, 2000));

        const response = await axios.post(`https://gomantabackend.onrender.com/api/donations/payment-status/${txnId}`);
        
        if (response.data.status === 'completed') {
          setStatus('success');
          toast.success('Thank you for your donation!');
        } else if (response.data.status === 'failed') {
          setStatus('failed');
          setError(response.data.message || 'Payment failed');
          toast.error(response.data.message || 'Payment failed');
        } else {
          setStatus('pending');
        }
      } catch (error) {
        console.error('Error verifying payment:', error);
        setStatus('failed');
        setError(error.response?.data?.message || 'Error verifying payment');
        toast.error(error.response?.data?.message || 'Error verifying payment');
      }
    };

    if (txnId) {
      verifyPayment();
    } else {
      setStatus('failed');
      setError('Invalid transaction ID');
    }
  }, [txnId]);

  const handleBackToHome = () => {
    navigate('/');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="max-w-md w-full p-8 bg-white rounded-lg shadow-lg">
        <h2 className="text-2xl font-bold mb-6 text-center">Payment Status</h2>
        
        {status === 'processing' && (
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p className="text-gray-600">Processing your payment...</p>
          </div>
        )}

        {status === 'success' && (
          <div className="text-center">
            <div className="mb-4">
              <svg className="h-16 w-16 text-green-500 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-green-600 mb-2">Thank You!</h3>
            <p className="text-gray-600 mb-2">Your donation was successful.</p>
            <p className="text-gray-600 mb-6">Your contribution will make a significant impact.</p>
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
              <p className="text-green-700 text-sm">A receipt has been sent to your email address.</p>
            </div>
          </div>
        )}

        {status === 'failed' && (
          <div className="text-center">
            <div className="mb-4">
              <svg className="h-16 w-16 text-red-500 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-red-600 mb-2">Payment Failed</h3>
            <p className="text-gray-600 mb-6">{error || 'An error occurred during payment.'}</p>
          </div>
        )}

        {status === 'pending' && (
          <div className="text-center">
            <div className="mb-4">
              <svg className="h-16 w-16 text-yellow-500 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-yellow-600 mb-2">Payment Pending</h3>
            <p className="text-gray-600 mb-6">Your payment is being processed.</p>
          </div>
        )}

        <button
          onClick={handleBackToHome}
          className="w-full py-2 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg shadow-md focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-opacity-75"
        >
          {status === 'success' ? 'Return to Homepage' : 'Back to Home'}
        </button>
      </div>
    </div>
  );
};

export default PaymentStatus;
