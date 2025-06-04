import React, { useState } from 'react';
import DonationForm from './DonationForm';

const DonationCard = ({ title, defaultAmount = 10000 }) => {
  const [showForm, setShowForm] = useState(false);
  const [amount, setAmount] = useState(defaultAmount / 100); // Convert default amount to rupees

  const handleDonate = () => {
    setShowForm(true);
  };

  return (
    <div className="max-w-md mx-auto bg-white rounded-lg shadow-md p-6 m-4">
      <h2 className="text-2xl font-semibold text-center mb-4">{title}</h2>
      
      <div className="text-gray-600 text-center mb-6">
        <p>How much would you like to donate? Your kindness as a contributor to
        the Gomantak Gausevak Mahasangh helps us provide love, care, and
        protection to our precious cattle. Every rupee you give goes directly to
        supporting their well-being. Thank you for your heartfelt generosity—
        together, we are creating a brighter, kinder future for them.</p>
      </div>

      <div className="mb-4">
        <div className="flex items-center border rounded-md p-2">
          <span className="text-gray-500 mr-2">₹</span>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(Number(e.target.value))}
            className="w-full outline-none"
            min="1"
          />
        </div>
      </div>

      <div className="text-gray-600 mb-4">
        <p>Yearly</p>
      </div>

      <button
        onClick={handleDonate}
        className="w-full bg-emerald-500 text-white py-2 px-4 rounded-md hover:bg-emerald-600 transition duration-300"
      >
        Donate
      </button>

      <div className="text-center mt-4">
        <span className="text-gray-500 text-sm flex items-center justify-center">
          <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
            <path d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 116 0z"/>
          </svg>
          Secure Donation
        </span>
      </div>

      {showForm && (
        <DonationForm
          amount={Math.round(amount * 100)} // Convert back to paise for the form
          onClose={() => setShowForm(false)}
        />
      )}
    </div>
  );
};

export default DonationCard;
