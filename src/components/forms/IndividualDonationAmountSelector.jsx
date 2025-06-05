import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

<<<<<<< HEAD
const PRESET_AMOUNTS = [
  365, 730, 1095, 1460, 1825, 2190, 2555, 2920, 3285, 3650
];
=======
// Calculate preset amounts based on daily rate of ₹1 for 1-10 years
const PRESET_AMOUNTS = Array.from({ length: 10 }, (_, i) => (i + 1) * 365);

// Format amount to Indian Rupees without decimal places
const formatAmount = (amount) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
};
>>>>>>> 711a1b8b1ec2ca9e8bffac396c8c72d1093f12d3

const IndividualDonationAmountSelector = () => {
  const [selectedAmount, setSelectedAmount] = useState(null);
  const [customAmount, setCustomAmount] = useState('');
  const navigate = useNavigate();

  const handlePresetAmountSelect = (amount) => {
    setSelectedAmount(amount);
    setCustomAmount('');
  };

  const handleCustomAmountChange = (e) => {
<<<<<<< HEAD
    const value = e.target.value.replace(/[^0-9]/g, '');
=======
    // Remove all non-digit characters and leading zeros
    let value = e.target.value.replace(/\D/g, '');
    // Convert to number to remove leading zeros
    value = value === '' ? '' : parseInt(value, 10).toString();
>>>>>>> 711a1b8b1ec2ca9e8bffac396c8c72d1093f12d3
    setCustomAmount(value);
    setSelectedAmount(null);
  };

  const handleContinue = () => {
<<<<<<< HEAD
    const finalAmount = selectedAmount || parseInt(customAmount);
    
    if (!finalAmount || finalAmount < 365) {
      alert('Please select a valid donation amount (minimum ₹365)');
=======
    const finalAmount = selectedAmount || parseInt(customAmount, 10);
    
    if (!finalAmount || isNaN(finalAmount) || finalAmount < 365) {
      alert('Please enter a valid donation amount (minimum ₹365)');
>>>>>>> 711a1b8b1ec2ca9e8bffac396c8c72d1093f12d3
      return;
    }

    // Navigate to donation form with selected amount
    navigate('/donate/individual', { 
      state: { 
<<<<<<< HEAD
        donationAmount: finalAmount 
=======
        donationAmount: finalAmount,
        donationType: 'Individual Donation',
        description: `Donation of ${formatAmount(finalAmount)}`
>>>>>>> 711a1b8b1ec2ca9e8bffac396c8c72d1093f12d3
      } 
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-emerald-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8">
        <h2 className="text-2xl font-bold text-emerald-800 text-center mb-6">
          Choose Amount for Individual Donation
        </h2>

        {/* Custom Amount Input */}
        <div className="mb-6">
          <label htmlFor="customAmount" className="block text-sm font-medium text-gray-700 mb-2">
            Enter Custom Amount
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <span className="text-gray-500">₹</span>
            </div>
            <input
              id="customAmount"
              type="text"
              value={customAmount}
              onChange={handleCustomAmountChange}
              placeholder="Enter amount"
<<<<<<< HEAD
=======
              inputMode="numeric"
              pattern="[0-9]*"
>>>>>>> 711a1b8b1ec2ca9e8bffac396c8c72d1093f12d3
              className="pl-8 block w-full rounded-lg border border-gray-300 py-2 px-4 
                focus:ring-emerald-500 focus:border-emerald-500"
            />
          </div>
        </div>

        {/* Preset Amount Buttons */}
        <div className="grid grid-cols-5 gap-2 mb-6">
          {PRESET_AMOUNTS.map((amount) => (
            <button
              key={amount}
              onClick={() => handlePresetAmountSelect(amount)}
              className={`py-2 px-2 rounded-lg text-sm font-semibold transition-all duration-200 
                ${selectedAmount === amount 
                  ? 'bg-emerald-500 text-white' 
                  : 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'}`}
            >
<<<<<<< HEAD
              ₹{amount.toLocaleString()}
=======
              {formatAmount(amount)}
>>>>>>> 711a1b8b1ec2ca9e8bffac396c8c72d1093f12d3
            </button>
          ))}
        </div>

        {/* Continue Button */}
        <button
          onClick={handleContinue}
          className="w-full bg-emerald-600 text-white py-3 rounded-lg 
            hover:bg-emerald-700 transition-colors duration-300 
            focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
        >
          Continue to Donation
        </button>
      </div>
    </div>
  );
};

export default IndividualDonationAmountSelector;
