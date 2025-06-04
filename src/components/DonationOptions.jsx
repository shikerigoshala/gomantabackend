import React, { useState } from 'react';
import DonationCard from './DonationCard';

const DonationOptions = () => {
  const [selectedOption, setSelectedOption] = useState(null);

  const donationTypes = [
    {
      id: 'adopt-a-calf',
      title: 'Adopt a Calf',
      defaultAmount: 10000
    },
    {
      id: 'feed-fodder',
      title: 'Feed Fodder',
      defaultAmount: 10000
    },
    {
      id: 'gau-daan',
      title: 'Gau Daan',
      defaultAmount: 10000
    },
    {
      id: 'custom-amount-donation',
      title: 'Custom Amount Donation',
      defaultAmount: 5000
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h1 className="text-3xl font-bold text-gray-900">Make a Donation</h1>
          <p className="mt-4 text-lg text-gray-600">Choose a donation type below</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {donationTypes.map((type) => (
            <div key={type.id}>
              <DonationCard
                title={type.title}
                defaultAmount={type.defaultAmount}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default DonationOptions;
