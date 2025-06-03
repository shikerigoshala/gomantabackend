import React from 'react';
import DonationFormBase from './DonationFormBase';

const GauDaanForm = () => {
  return (
    <DonationFormBase
      title="Gau Daan Yearly Donation"
      amount={10000}
      donationType="Gau Daan"
    />
  );
};

export default GauDaanForm;
