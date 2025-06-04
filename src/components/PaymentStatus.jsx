import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import donationService from '../services/donationService';
import { toast } from 'react-hot-toast';

const PaymentStatus = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState('processing');
  const [error, setError] = useState(null);

  useEffect(() => {
    const verifyPayment = async () => {
      try {
        const txnId = searchParams.get('txnId');
        
        if (!txnId) {
          setError('Invalid transaction ID');
          setStatus('failed');
          return;
        }

        // Wait for 2 seconds to allow the payment to be processed
        await new Promise(resolve => setTimeout(resolve, 2000));

        const result = await donationService.getDonationStatus(txnId);
        
        if (result.status === 'completed') {
          setStatus('success');
          toast.success('Payment successful! Thank you for your donation.');
          // Redirect to thank-you page after 2 seconds
          setTimeout(() => navigate(`/thank-you?txnId=${txnId}&status=success`), 2000);
        } else if (result.status === 'failed') {
          setStatus('failed');
          setError(result.message || 'Payment verification failed');
        } else {
          setStatus('pending');
        }
      } catch (error) {
        console.error('Payment verification error:', error);
        setStatus('failed');
        setError(error.response?.data?.message || 'Error verifying payment');
      }
    };

    verifyPayment();
  }, [searchParams, navigate]);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
        <div className="text-center">
          {status === 'processing' && (
            <>
              <div className="mx-auto h-16 w-16 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent"></div>
              <h2 className="mt-4 text-xl font-semibold text-gray-800">Verifying Payment</h2>
              <p className="mt-2 text-gray-600">Please wait while we confirm your payment...</p>
            </>
          )}

          {status === 'success' && (
            <>
              <div className="mx-auto h-16 w-16 flex items-center justify-center rounded-full bg-emerald-100">
                <svg className="h-10 w-10 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                </svg>
              </div>
              <h2 className="mt-4 text-xl font-semibold text-gray-800">Payment Successful!</h2>
              <p className="mt-2 text-gray-600">Thank you for your donation. You will be redirected to the dashboard shortly.</p>
            </>
          )}

          {status === 'failed' && (
            <>
              <div className="mx-auto h-16 w-16 flex items-center justify-center rounded-full bg-red-100">
                <svg className="h-10 w-10 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                </svg>
              </div>
              <h2 className="mt-4 text-xl font-semibold text-gray-800">Payment Failed</h2>
              <p className="mt-2 text-gray-600">{error || 'Something went wrong with your payment.'}</p>
              <button
                onClick={() => navigate(-1)}
                className="mt-4 inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-emerald-500 hover:bg-emerald-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500"
              >
                Try Again
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default PaymentStatus;
