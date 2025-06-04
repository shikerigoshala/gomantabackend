import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { indianStates } from '../../data/indianStates';
import { countries } from '../../data/countries';
import { toast } from 'react-hot-toast';

const FIXED_AMOUNTS = {
  'Adopt a Cow Premium': 36500,
  'Adopt a Cow Standard': 18500,
  'Adopt a Calf': 18500,
  'Feed Fodder': 500,
  'Gau Daan': 10000,
  'Family Group Donation': 365
};

const DonationFormBase = ({ title, amount, donationType, description, onSubmit, isProcessing = false, additionalFields = [], customFormElements = null, allowFamilyMembers = false }) => {
  const location = useLocation();
  const [availableCities, setAvailableCities] = useState([]);
  const [showCityDropdown, setShowCityDropdown] = useState(false);
  const [filteredCities, setFilteredCities] = useState([]);
  const dropdownRef = useRef(null);

  const [selectedAmount, setSelectedAmount] = useState(null);
  const [customAmount, setCustomAmount] = useState('');
  // Define all donation types
  const DONATION_TYPES = {
    INDIVIDUAL: 'Individual Donation',
    FAMILY_GROUP: 'Family Group Donation',
    CUSTOM: 'Custom Donation',
    MONTHLY: 'Monthly Donation',
    YEARLY: 'Yearly Donation',
    ONE_TIME: 'One Time Donation',
    CORPORATE: 'Corporate Donation'
  };

  // Set default amount based on props
  useEffect(() => {
    if (amount) {
      setSelectedAmount(amount);
      setCustomAmount(amount.toString());
      setFormData(prev => ({ ...prev, amount }));
    } else if (donationType === 'Individual Donation') {
      setSelectedAmount(365);
      setCustomAmount('365');
      setFormData(prev => ({ ...prev, amount: 365 }));
    }
  }, [donationType, amount]);

  // Define preset amounts based on donation type
  const getPresetAmounts = () => {
    switch (donationType) {
      case DONATION_TYPES.INDIVIDUAL:
        return [365, 730, 1095, 1460, 1825, 2190, 2555, 2920, 3285, 3650];
      case DONATION_TYPES.FAMILY_GROUP:
        return [1100, 2100, 5100, 11000, 21000];
      case DONATION_TYPES.MONTHLY:
        return [100, 500, 1000, 2100, 5100];
      case DONATION_TYPES.YEARLY:
        return [1100, 2100, 5100, 11000, 21000];
      case DONATION_TYPES.ONE_TIME:
        return [500, 1100, 2100, 5100, 11000];
      case DONATION_TYPES.CORPORATE:
        return [11000, 21000, 51000, 101000, 201000];
      default:
        return [100, 500, 1000, 2100, 5100];
    }
  };

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    country: 'India',
    pincode: '',
    pan: '',
    amount: amount || 365,
    frequency: 'yearly',
    incomeTaxRebate: 'no',
    agreeToTerms: false,
    wants80GTaxBenefit: false,
    familyMembers: allowFamilyMembers || donationType === 'Family Group Donation' ? [{ name: 'Primary Member', age: '', relation: 'Self' }] : [],
    ...additionalFields.reduce((acc, field) => ({ ...acc, [field.name]: field.value !== undefined ? field.value : '' }), {})
  });

  // Automatically set fixed amount for non-individual donations
  useEffect(() => {
    if (donationType !== 'Individual Donation' && FIXED_AMOUNTS[donationType]) {
      setSelectedAmount(FIXED_AMOUNTS[donationType]);
    }
  }, [donationType]);

  // Check for passed state from amount selector
  useEffect(() => {
    if (location.state?.donationAmount) {
      setSelectedAmount(location.state.donationAmount);
    }
  }, [location.state]);

  const handlePresetAmountSelect = (amount) => {
    setSelectedAmount(amount);
    setCustomAmount(amount.toString());
    setFormData(prev => ({ ...prev, amount }));
  };

  const handleCustomAmountChange = (e) => {
    const value = e.target.value.replace(/[^0-9]/g, '');
    setCustomAmount(value);
    const numValue = value ? parseInt(value) : null;
    setSelectedAmount(numValue);
    setFormData(prev => ({
      ...prev,
      amount: numValue,
      calculatedAmount: numValue ? (numValue * 100).toString() : '0'
    }));
  };

  const getDonationAmount = () => {
    // For Family Group Donation, use the calculated amount from formData if available
    if (donationType === 'Family Group Donation') {
      if (formData.calculatedAmount) {
        return parseInt(formData.calculatedAmount) / 100; // Convert paise to rupees
      }
      // Default to 1 member if no members added yet
      return 365; // ₹365 for 1 member
    }
    // For other non-Individual donations, use fixed amount if available
    if (donationType !== 'Individual Donation') {
      const fixedAmount = FIXED_AMOUNTS[donationType] || 0;
      return fixedAmount >= 1000 ? fixedAmount / 100 : fixedAmount; // Convert paise to rupees if needed
    }
    // For Individual donations, use selected or custom amount
    const amount = selectedAmount || (customAmount ? parseInt(customAmount) : 0);
    return amount >= 1000 ? amount / 100 : amount; // Convert paise to rupees if needed
  };
  
  // Update form data when family members change
  useEffect(() => {
    if (donationType === 'Family Group Donation' || allowFamilyMembers) {
      // Filter out any empty member entries and ensure we have at least one member
      const validMembers = (formData.familyMembers || []).filter(member => member?.name?.trim());
      const members = validMembers.length > 0 ? validMembers : [{ name: 'Primary Member', age: '', relation: 'Self' }];
      
      const memberCount = members.length;
      const amountPerMember = 365; // ₹365 per member per year
      const calculatedAmount = memberCount * amountPerMember;
      
      // Only update if the values have changed to prevent infinite loop
      if (formData.amount !== calculatedAmount) {
        setFormData(prev => ({
          ...prev,
          familyMembers: members,
          amount: calculatedAmount, // Store in rupees
          calculatedAmount: (calculatedAmount * 100).toString(), // Store in paise for payment
          donationDescription: `${memberCount} member${memberCount > 1 ? 's' : ''} × ₹365/year = ₹${calculatedAmount.toLocaleString()}`
        }));
        setSelectedAmount(calculatedAmount);
        setCustomAmount(calculatedAmount.toString());
      }
    }
  }, [formData.familyMembers, donationType, allowFamilyMembers, formData.amount]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      // Validate form
      if (!formData.agreeToTerms) {
        toast.error('Please agree to the terms and conditions');
        return;
      }

      if (!formData.name || !formData.email || !formData.phone) {
        toast.error('Please fill in all required fields');
        return;
      }

      // Validate PAN if 80G benefit is selected
      if (formData.wants80GTaxBenefit) {
        if (!formData.pan) {
          toast.error('PAN number is required for 80G tax benefit');
          return;
        }
        const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
        if (!panRegex.test(formData.pan)) {
          toast.error('Please enter a valid PAN number (e.g., ABCDE1234F)');
          return;
        }
      }

      // Validate PAN if 80G benefit is selected
      if (formData.wants80GTaxBenefit && !formData.pan) {
        toast.error('PAN number is required for 80G tax benefit');
        return;
      }

      if (formData.wants80GTaxBenefit && !/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(formData.pan)) {
        toast.error('Please enter a valid PAN number');
        return;
      }

      // Get final amount
      const finalAmount = getDonationAmount();

      if (!finalAmount || finalAmount < 100) {
        toast.error('Please enter a valid amount (minimum ₹100)');
        return;
      }

      // Prepare form data for submission
      const submissionData = {
        ...formData,
        amount: finalAmount,
        donationType
      };

      // Pass data to parent component's onSubmit handler
      if (typeof onSubmit === 'function') {
        await onSubmit(submissionData);
        return;
      }

      // If no onSubmit handler provided, use default payment flow
      const response = await fetch('http://localhost:3001https://gomantabackend.onrender.com/api/donations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: finalAmount,
          donorInfo: {
            name: formData.name,
            email: formData.email,
            phone: formData.phone,
            address: formData.address,
            city: formData.city,
            state: formData.state,
            pincode: formData.pincode,
            pan: formData.pan
          },
          donationType
        })
      });

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.message || 'Failed to initialize payment');
      }

      // Store donation ID
      sessionStorage.setItem('currentDonationId', result.donationId);

      // Handle different payment methods
      if (result.payment_url) {
        // PhonePe or other redirect-based payment
        window.location.href = result.payment_url;
      } else if (result.order && result.order.orderId) {
        // Razorpay integration - handled by parent component
        console.log('Razorpay order created, waiting for parent component to handle payment');
      } else {
        throw new Error('No payment information received from server');
      }

    } catch (error) {
      console.error('Payment error:', error);
      toast.error(error.message || 'Failed to process payment. Please try again.');
      console.error('Error submitting form:', error);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === 'country') {
      // Reset state and city when country changes
      setFormData(prev => ({ ...prev, [name]: value, state: '', city: '' }));
    } else if (name === 'state') {
      setFormData(prev => ({ ...prev, [name]: value, city: '' }));
    } else if (name === 'city') {
      setFormData(prev => ({ ...prev, [name]: value }));
      if (formData.country === 'India') {
        filterCities(value);
      }
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const filterCities = (search) => {
    if (!search) {
      setFilteredCities(availableCities);
    } else {
      const filtered = availableCities.filter(city =>
        city.toLowerCase().includes(search.toLowerCase())
      );
      setFilteredCities(filtered);
    }
  };

  const handleCitySelect = (city) => {
    setFormData(prev => ({ ...prev, city }));
    setShowCityDropdown(false);
  };

  const handleCityInputFocus = () => {
    if (formData.country === 'India' && formData.state) {
      setShowCityDropdown(true);
      setFilteredCities(availableCities);
    }
  };

  const handleClickOutside = (event) => {
    if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
      setShowCityDropdown(false);
    }
  };

  // Update available cities when state changes
  useEffect(() => {
    if (formData.state) {
      const cities = indianStates[formData.state] || [];
      setAvailableCities(cities);
      setFilteredCities(cities);
    } else {
      setAvailableCities([]);
      setFilteredCities([]);
    }
  }, [formData.state]);

  // Add click outside listener
  useEffect(() => {
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleAddFamilyMember = () => {
    setFormData({
      ...formData,
      familyMembers: [...formData.familyMembers, { name: '', age: '', relation: '' }]
    });
  };

  const handleRemoveFamilyMember = (index) => {
    const updatedMembers = formData.familyMembers.filter((_, i) => i !== index);
    setFormData({
      ...formData,
      familyMembers: updatedMembers
    });
  };

  const handleFamilyMemberChange = (index, field, value) => {
    const updatedMembers = formData.familyMembers.map((member, i) => {
      if (i === index) {
        return { ...member, [field]: value };
      }
      return member;
    });
    setFormData({
      ...formData,
      familyMembers: updatedMembers
    });
  };

  // Add state for modal
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editAmount, setEditAmount] = useState('');
  const [editFrequency, setEditFrequency] = useState('');
  const [frequency, setFrequency] = useState('yearly');
  const [initialAmount, setInitialAmount] = useState(0);

  // Get current donation amount
  const getCurrentAmount = () => {
    if (donationType === 'Individual Donation') {
      return selectedAmount || (customAmount ? parseInt(customAmount) : 0);
    }
    return FIXED_AMOUNTS[donationType] || 0;
  };

  // Update Edit Donation button
  const handleEditDonation = () => {
    // Initialize modal with current values
    const currentAmount = getCurrentAmount();
    setInitialAmount(currentAmount);
    setEditAmount(currentAmount.toString());
    setEditFrequency(frequency);
    setIsEditModalOpen(true);
  };

  // Add Edit Donation Modal
  const EditDonationModal = () => {
    const frequencies = [
      { value: 'yearly', label: 'Yearly', amount: initialAmount },
      // { value: 'monthly', label: 'Monthly', amount: Math.round(initialAmount / 12) },
      { value: 'one-time', label: 'One Time', amount: initialAmount }
    ];

    const handleAmountChange = (e) => {
      const value = e.target.value.replace(/[^0-9]/g, '');
      if (value === '') {
        setEditAmount('');
      } else {
        const numValue = parseInt(value);
        if (numValue >= 100) {
          setEditAmount(value);
        }
      }
    };

    const handleFrequencyChange = (e) => {
      setEditFrequency(e.target.value);
    };

    const handleConfirm = () => {
      const numericAmount = editAmount ? parseInt(editAmount) : initialAmount;

      if (numericAmount < 100) {
        toast.error('Please enter a valid amount (minimum ₹100)');
        return;
      }

      // Update state based on donation type
      if (donationType === 'Individual Donation') {
        setSelectedAmount(numericAmount);
        setCustomAmount(numericAmount.toString());
      }

      // Update frequency
      setFrequency(editFrequency);

      // Update the displayed amount based on frequency
      let finalAmount = numericAmount;
      if (editFrequency === 'monthly') {
        finalAmount = Math.round(numericAmount / 12);
      }

      // Update form data
      setFormData(prev => ({
        ...prev,
        amount: finalAmount,
        frequency: editFrequency,
        ...(donationType === 'Individual Donation' && {
          customAmount: numericAmount.toString()
        })
      }));

      setIsEditModalOpen(false);
      toast.success('Donation details updated successfully');
    };

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50">
        <div className="bg-white rounded-2xl p-6 w-[90%] max-w-md mx-4 shadow-lg">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-semibold text-gray-800">Edit Donation</h3>
            <button
              onClick={() => setIsEditModalOpen(false)}
              className="text-gray-400 hover:text-gray-500"
            >
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="space-y-4">
            {/* Amount Input */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Donation Amount</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <span className="text-gray-500">₹</span>
                </div>
                <input
                  type="text"
                  value={editAmount}
                  onChange={handleAmountChange}
                  placeholder="Enter amount"
                  className="pl-8 block w-full rounded-lg border border-gray-300 py-2 px-4 
                    focus:ring-emerald-500 focus:border-emerald-500"
                />
              </div>
              {editAmount && parseInt(editAmount) < 100 && (
                <p className="text-sm text-red-500 mt-1">Amount must be at least ₹100</p>
              )}
              <p className="text-sm text-gray-500 mt-1">Minimum amount: ₹100</p>
            </div>

            {/* Frequency Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Giving Frequency</label>
              <select
                value={editFrequency}
                onChange={handleFrequencyChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-emerald-500 focus:border-emerald-500"
              >
                {frequencies.map((freq) => (
                  <option key={freq.value} value={freq.value}>
                    {freq.label} - ₹{freq.amount.toLocaleString()}
                  </option>
                ))}
              </select>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="px-4 py-2 text-gray-700 hover:text-gray-900"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirm}
                disabled={!editAmount || parseInt(editAmount) < 100}
                className="px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors duration-200 
                  disabled:bg-emerald-300 disabled:cursor-not-allowed disabled:hover:bg-emerald-300"
              >
                Update Donation
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-emerald-100 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl bg-white rounded-2xl shadow-xl p-8">
        <h2 className="text-2xl font-bold text-emerald-800 text-center mb-2">
          {donationType} Form
        </h2>
        {description && <p className="text-gray-600 text-center mb-6">{description}</p>}

        {/* Amount Selector Section - Show for all donation types */}
        {donationType === 'Individual Donation' && (
          <div className="mb-6 bg-emerald-50 p-4 rounded-lg">
            <h3 className="text-lg font-semibold text-emerald-800 mb-4">
              Choose Donation Amount
            </h3>

            {/* Custom Amount Input */}
            <div className="mb-4">
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
                  className="pl-8 block w-full rounded-lg border border-gray-300 py-2 px-4 
                    focus:ring-emerald-500 focus:border-emerald-500"
                />
              </div>
              <p className="text-sm text-gray-500 mt-2">
                Minimum amount: ₹365
              </p>
            </div>

            {/* Preset Amount Buttons */}
            <div className="grid grid-cols-5 gap-2">
              {getPresetAmounts().map((presetAmount) => (
                <button
                  key={presetAmount}
                  type="button"
                  onClick={() => handlePresetAmountSelect(presetAmount)}
                  className={`py-2 px-2 rounded-lg text-sm font-semibold transition-all duration-200 
                    ${selectedAmount === presetAmount
                      ? 'bg-emerald-500 text-white'
                      : 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'}`}
                >
                  ₹{presetAmount.toLocaleString()}
                </button>
              ))}
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6 px-4 sm:px-6 md:px-8 max-w-7xl mx-auto">
          {/* Donation Summary */}
          {donationType === 'Family Group Donation' && formData.donationDescription && (
            <div className="bg-emerald-50 border-l-4 border-emerald-400 p-4 rounded">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-emerald-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-emerald-700 font-medium">
                    {formData.donationDescription}
                  </p>
                  <p className="mt-1 text-sm text-emerald-600">
                    Thank you for supporting our cause with your entire family!
                  </p>
                </div>
              </div>
            </div>
          )}
          
          {/* Existing form fields */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
            {donationType === 'Family Group Donation' && (
              <div className="col-span-1 sm:col-span-2 space-y-4 border-t pt-4 mt-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-semibold">Family Members</h3>
                  <button
                    type="button"
                    onClick={handleAddFamilyMember}
                    className="px-4 py-2 bg-emerald-500 text-white rounded hover:bg-emerald-600 transition-colors"
                  >
                    Add Member
                  </button>
                </div>
                {formData.familyMembers.map((member, index) => (
                  <div key={index} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-center border p-4 rounded bg-white shadow-sm">
                    <div className="sm:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                      <input
                        type="text"
                        value={member.name}
                        onChange={(e) => handleFamilyMemberChange(index, 'name', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                        required
                        placeholder="Enter full name"
                      />
                    </div>
                    <div className="sm:col-span-1">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Age</label>
                      <input
                        type="number"
                        value={member.age}
                        onChange={(e) => handleFamilyMemberChange(index, 'age', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                        required
                        min="0"
                        placeholder="Enter age"
                      />
                    </div>
                    <div className="sm:col-span-1">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Relation</label>
                      <input
                        type="text"
                        value={member.relation}
                        onChange={(e) => handleFamilyMemberChange(index, 'relation', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                        required
                        placeholder="e.g., Father, Mother, Child"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                      <input
                        type="email"
                        value={member.email}
                        onChange={(e) => handleFamilyMemberChange(index, 'email', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                        required
                        placeholder="Enter email address"
                      />
                    </div>
                    <div className="col-span-full flex justify-end items-center gap-2 pt-2">
                      {index > 0 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveFamilyMember(index)}
                          className="px-3 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition-colors text-sm"
                          title="Remove member"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
              <input
                type="text"
                name="name"
                required
                value={formData.name}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
              <input
                type="email"
                name="email"
                required
                value={formData.email}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
              <input
                type="tel"
                name="phone"
                required
                pattern="[0-9]{10}"
                value={formData.phone}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Country</label>
              <select
                name="country"
                value={formData.country}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white"
              >
                <option value="Afghanistan">Afghanistan</option>
                <option value="Albania">Albania</option>
                <option value="Algeria">Algeria</option>
                <option value="Andorra">Andorra</option>
                <option value="Angola">Angola</option>
                <option value="Antigua and Barbuda">Antigua and Barbuda</option>
                <option value="Argentina">Argentina</option>
                <option value="Armenia">Armenia</option>
                <option value="Australia">Australia</option>
                <option value="Austria">Austria</option>
                <option value="Azerbaijan">Azerbaijan</option>
                <option value="Bahamas">Bahamas</option>
                <option value="Bahrain">Bahrain</option>
                <option value="Bangladesh">Bangladesh</option>
                <option value="Barbados">Barbados</option>
                <option value="Belarus">Belarus</option>
                <option value="Belgium">Belgium</option>
                <option value="Belize">Belize</option>
                <option value="Benin">Benin</option>
                <option value="Bhutan">Bhutan</option>
                <option value="Bolivia">Bolivia</option>
                <option value="Bosnia and Herzegovina">Bosnia and Herzegovina</option>
                <option value="Botswana">Botswana</option>
                <option value="Brazil">Brazil</option>
                <option value="Brunei">Brunei</option>
                <option value="Bulgaria">Bulgaria</option>
                <option value="Burkina Faso">Burkina Faso</option>
                <option value="Burundi">Burundi</option>
                <option value="Cambodia">Cambodia</option>
                <option value="Cameroon">Cameroon</option>
                <option value="Canada">Canada</option>
                <option value="Cape Verde">Cape Verde</option>
                <option value="Central African Republic">Central African Republic</option>
                <option value="Chad">Chad</option>
                <option value="Chile">Chile</option>
                <option value="China">China</option>
                <option value="Colombia">Colombia</option>
                <option value="Comoros">Comoros</option>
                <option value="Congo (Brazzaville)">Congo (Brazzaville)</option>
                <option value="Congo (Kinshasa)">Congo (Kinshasa)</option>
                <option value="Costa Rica">Costa Rica</option>
                <option value="Croatia">Croatia</option>
                <option value="Cuba">Cuba</option>
                <option value="Cyprus">Cyprus</option>
                <option value="Czech Republic">Czech Republic</option>
                <option value="Denmark">Denmark</option>
                <option value="Djibouti">Djibouti</option>
                <option value="Dominica">Dominica</option>
                <option value="Dominican Republic">Dominican Republic</option>
                <option value="Ecuador">Ecuador</option>
                <option value="Egypt">Egypt</option>
                <option value="El Salvador">El Salvador</option>
                <option value="Equatorial Guinea">Equatorial Guinea</option>
                <option value="Eritrea">Eritrea</option>
                <option value="Estonia">Estonia</option>
                <option value="Eswatini">Eswatini</option>
                <option value="Ethiopia">Ethiopia</option>
                <option value="Fiji">Fiji</option>
                <option value="Finland">Finland</option>
                <option value="France">France</option>
                <option value="Gabon">Gabon</option>
                <option value="Gambia">Gambia</option>
                <option value="Georgia">Georgia</option>
                <option value="Germany">Germany</option>
                <option value="Ghana">Ghana</option>
                <option value="Greece">Greece</option>
                <option value="Grenada">Grenada</option>
                <option value="Guatemala">Guatemala</option>
                <option value="Guinea">Guinea</option>
                <option value="Guinea-Bissau">Guinea-Bissau</option>
                <option value="Guyana">Guyana</option>
                <option value="Haiti">Haiti</option>
                <option value="Honduras">Honduras</option>
                <option value="Hungary">Hungary</option>
                <option value="Iceland">Iceland</option>
                <option value="India">India</option>
                <option value="Indonesia">Indonesia</option>
                <option value="Iran">Iran</option>
                <option value="Iraq">Iraq</option>
                <option value="Ireland">Ireland</option>
                <option value="Israel">Israel</option>
                <option value="Italy">Italy</option>
                <option value="Jamaica">Jamaica</option>
                <option value="Japan">Japan</option>
                <option value="Jordan">Jordan</option>
                <option value="Kazakhstan">Kazakhstan</option>
                <option value="Kenya">Kenya</option>
                <option value="Kiribati">Kiribati</option>
                <option value="Kuwait">Kuwait</option>
                <option value="Kyrgyzstan">Kyrgyzstan</option>
                <option value="Laos">Laos</option>
                <option value="Latvia">Latvia</option>
                <option value="Lebanon">Lebanon</option>
                <option value="Lesotho">Lesotho</option>
                <option value="Liberia">Liberia</option>
                <option value="Libya">Libya</option>
                <option value="Liechtenstein">Liechtenstein</option>
                <option value="Lithuania">Lithuania</option>
                <option value="Luxembourg">Luxembourg</option>
                <option value="Madagascar">Madagascar</option>
                <option value="Malawi">Malawi</option>
                <option value="Malaysia">Malaysia</option>
                <option value="Maldives">Maldives</option>
                <option value="Mali">Mali</option>
                <option value="Malta">Malta</option>
                <option value="Marshall Islands">Marshall Islands</option>
                <option value="Mauritania">Mauritania</option>
                <option value="Mauritius">Mauritius</option>
                <option value="Mexico">Mexico</option>
                <option value="Micronesia">Micronesia</option>
                <option value="Moldova">Moldova</option>
                <option value="Monaco">Monaco</option>
                <option value="Mongolia">Mongolia</option>
                <option value="Montenegro">Montenegro</option>
                <option value="Morocco">Morocco</option>
                <option value="Mozambique">Mozambique</option>
                <option value="Myanmar">Myanmar</option>
                <option value="Namibia">Namibia</option>
                <option value="Nauru">Nauru</option>
                <option value="Nepal">Nepal</option>
                <option value="Netherlands">Netherlands</option>
                <option value="New Zealand">New Zealand</option>
                <option value="Nicaragua">Nicaragua</option>
                <option value="Niger">Niger</option>
                <option value="Nigeria">Nigeria</option>
                <option value="North Korea">North Korea</option>
                <option value="North Macedonia">North Macedonia</option>
                <option value="Norway">Norway</option>
                <option value="Oman">Oman</option>
                <option value="Pakistan">Pakistan</option>
                <option value="Palau">Palau</option>
                <option value="Palestine">Palestine</option>
                <option value="Panama">Panama</option>
                <option value="Papua New Guinea">Papua New Guinea</option>
                <option value="Paraguay">Paraguay</option>
                <option value="Peru">Peru</option>
                <option value="Philippines">Philippines</option>
                <option value="Poland">Poland</option>
                <option value="Portugal">Portugal</option>
                <option value="Qatar">Qatar</option>
                <option value="Romania">Romania</option>
                <option value="Russia">Russia</option>
                <option value="Rwanda">Rwanda</option>
                <option value="Saint Kitts and Nevis">Saint Kitts and Nevis</option>
                <option value="Saint Lucia">Saint Lucia</option>
                <option value="Saint Vincent and the Grenadines">Saint Vincent and the Grenadines</option>
                <option value="Samoa">Samoa</option>
                <option value="San Marino">San Marino</option>
                <option value="Saudi Arabia">Saudi Arabia</option>
                <option value="Senegal">Senegal</option>
                <option value="Serbia">Serbia</option>
                <option value="Seychelles">Seychelles</option>
                <option value="Sierra Leone">Sierra Leone</option>
                <option value="Singapore">Singapore</option>
                <option value="Slovakia">Slovakia</option>
                <option value="Slovenia">Slovenia</option>
                <option value="Solomon Islands">Solomon Islands</option>
                <option value="Somalia">Somalia</option>
                <option value="South Africa">South Africa</option>
                <option value="South Korea">South Korea</option>
                <option value="South Sudan">South Sudan</option>
                <option value="Spain">Spain</option>
                <option value="Sri Lanka">Sri Lanka</option>
                <option value="Sudan">Sudan</option>
                <option value="Suriname">Suriname</option>
                <option value="Sweden">Sweden</option>
                <option value="Switzerland">Switzerland</option>
                <option value="Syria">Syria</option>
                <option value="Taiwan">Taiwan</option>
                <option value="Tajikistan">Tajikistan</option>
                <option value="Tanzania">Tanzania</option>
                <option value="Thailand">Thailand</option>
                <option value="Timor-Leste">Timor-Leste</option>
                <option value="Togo">Togo</option>
                <option value="Tonga">Tonga</option>
                <option value="Trinidad and Tobago">Trinidad and Tobago</option>
                <option value="Tunisia">Tunisia</option>
                <option value="Turkey">Turkey</option>
                <option value="Turkmenistan">Turkmenistan</option>
                <option value="Tuvalu">Tuvalu</option>
                <option value="Uganda">Uganda</option>
                <option value="Ukraine">Ukraine</option>
                <option value="United Arab Emirates">United Arab Emirates</option>
                <option value="United Kingdom">United Kingdom</option>
                <option value="United States">United States</option>
                <option value="Uruguay">Uruguay</option>
                <option value="Uzbekistan">Uzbekistan</option>
                <option value="Vanuatu">Vanuatu</option>
                <option value="Venezuela">Venezuela</option>
                <option value="Vietnam">Vietnam</option>
                <option value="Yemen">Yemen</option>
                <option value="Zambia">Zambia</option>
                <option value="Zimbabwe">Zimbabwe</option>
              </select>
            </div>

          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
              <input
                type="text"
                name="address"
                required
                value={formData.address}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
            <div className="col-span-2 sm:col-span-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">State/Province</label>
              {formData.country === 'India' ? (
                <select
                  name="state"
                  required
                  value={formData.state}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white"
                >
                  <option value="">Select State</option>
                  {Object.keys(indianStates).map(state => (
                    <option key={state} value={state}>{state}</option>
                  ))}
                </select>
              ) : countries[formData.country] && countries[formData.country].states ? (
                <select
                  name="state"
                  required
                  value={formData.state}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white"
                >
                  <option value="">Select State/Province</option>
                  {countries[formData.country].states.map(state => (
                    <option key={state} value={state}>{state}</option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  name="state"
                  required
                  value={formData.state}
                  onChange={handleChange}
                  placeholder="Enter state/province"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white"
                />
              )}
            </div>

            <div className="col-span-2 sm:col-span-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
              {formData.country === 'India' && formData.state ? (
                <div className="relative">
                  <input
                    type="text"
                    name="city"
                    required
                    value={formData.city}
                    onChange={handleChange}
                    onFocus={handleCityInputFocus}
                    placeholder="Select or type city name"
                    className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white"
                  />
                  {formData.city && (
                    <button
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, city: '' }))}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                      </svg>
                    </button>
                  )}
                  {showCityDropdown && formData.state && (
                    <div
                      ref={dropdownRef}
                      className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-auto"
                    >
                      {filteredCities.length > 0 ? (
                        filteredCities.map(city => (
                          <button
                            key={city}
                            type="button"
                            onClick={() => handleCitySelect(city)}
                            className="w-full px-4 py-2 text-left hover:bg-gray-100 focus:bg-gray-100 focus:outline-none"
                          >
                            {city}
                          </button>
                        ))
                      ) : (
                        <div className="px-4 py-2 text-gray-500">No cities found</div>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <input
                  type="text"
                  name="city"
                  required
                  value={formData.city}
                  onChange={handleChange}
                  placeholder="Enter city name"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white"
                />
              )}
            </div>

            <div className="col-span-2 sm:col-span-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">ZIP Code</label>
              <input
                type="text"
                name="zipCode"
                required
                pattern="[0-9]{6}"
                value={formData.zipCode}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              />
            </div>

            <div className="col-span-2 sm:col-span-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">Date of Birth</label>
              <input
                type="date"
                name="dateOfBirth"
                required
                value={formData.dateOfBirth}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              />
            </div>

            <div className="col-span-2 sm:col-span-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">Suggested By</label>
              <input
                type="text"
                name="suggestedBy"
                value={formData.suggestedBy}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              />
            </div>

            <div className="col-span-2 sm:col-span-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">Give Reason for Donation</label>
              <select
                name="willingness"
                value={formData.willingness}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white"
              >
                <option value="">Select Option</option>
                <option value="Willingness to Help or Support">Willingness to Help or Support</option>
                <option value="Festival">Festival</option>
                <option value="Puja or Worship Ceremony">Puja or Worship Ceremony</option>
                <option value="Birthday">Birthday</option>
                <option value="Wedding Anniversary">Wedding Anniversary</option>
                <option value="Company Anniversary">Company Anniversary</option>
                <option value="Death Anniversary">Death Anniversary</option>
                <option value="In Memory of a Loved One">In Memory of a Loved One</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div className="col-span-2">
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  name="agreeToTerms"
                  checked={formData.agreeToTerms}
                  onChange={(e) => handleChange({ target: { name: 'agreeToTerms', value: e.target.checked } })}
                  className="h-4 w-4 text-emerald-600 focus:ring-emerald-500 border-gray-300 rounded"
                />
                <span className="text-sm text-gray-700">I agree to the terms and conditions</span>
              </label>
            </div>

            {/* Additional Fields */}
            {/* {additionalFields.map((field) => (
              <div key={field.name} className="col-span-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">{field.label}</label>
                <input
                  type={field.type}
                  name={field.name}
                  required={field.required}
                  value={formData[field.name] || ''}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                />
              </div>
            ))} */}

            {/* Custom Form Elements */}
            {customFormElements}
          </div>

          {/* 80G Tax Benefit Section */}
          <div className="mb-6 p-4 border border-gray-200 rounded-lg bg-gray-50">
            <h4 className="text-md font-medium text-gray-800 mb-3">Tax Benefit Options</h4>
            
            <div className="space-y-4">
              <div className="flex items-start">
                <div className="flex items-center h-5">
                  <input
                    id="wants80GTaxBenefit"
                    name="wants80GTaxBenefit"
                    type="checkbox"
                    checked={formData.wants80GTaxBenefit}
                    onChange={(e) => setFormData(prev => ({ ...prev, wants80GTaxBenefit: e.target.checked, pan: e.target.checked ? prev.pan : '' }))}
                    className="h-4 w-4 text-emerald-600 focus:ring-emerald-500 border-gray-300 rounded"
                  />
                </div>
                <div className="ml-3 text-sm">
                  <label htmlFor="wants80GTaxBenefit" className="font-medium text-gray-700">
                    I want to claim 80G tax benefit for this donation
                  </label>
                  <p className="text-gray-500">
                    You'll receive a tax exemption certificate under Section 80G of the Income Tax Act.
                  </p>
                </div>
              </div>

              {formData.wants80GTaxBenefit && (
                <div className="mt-4 ml-7">
                  <label htmlFor="pan" className="block text-sm font-medium text-gray-700 mb-1">
                    PAN Number <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="pan"
                    name="pan"
                    value={formData.pan || ''}
                    onChange={handleChange}
                    className="w-full md:w-1/2 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 uppercase"
                    placeholder="ABCDE1234F"
                    required={formData.wants80GTaxBenefit}
                    pattern="[A-Z]{5}[0-9]{4}[A-Z]{1}"
                    title="Please enter a valid PAN number (e.g., ABCDE1234F)"
                    maxLength="10"
                    onInput={(e) => {
                      e.target.value = e.target.value.toUpperCase();
                      handleChange(e);
                    }}
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Enter your 10-digit PAN (e.g., ABCDE1234F)
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Account and Tax Section */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
            <div className="col-span-2">
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  name="agreeToYearlyDonation"
                  checked={formData.agreeToYearlyDonation}
                  onChange={(e) => handleChange({ target: { name: 'agreeToYearlyDonation', value: e.target.checked } })}
                  className="h-4 w-4 text-emerald-600 focus:ring-emerald-500 border-gray-300 rounded"
                />
                <span className="text-sm text-gray-700">I agree to Donate Rs 365 per year to Shikeri Goashala towards Gauseva.</span>
              </label>
            </div>
          </div>






          {/* Payment Details Section */}
          <div className="bg-white border border-gray-200 rounded-lg p-4 sm:p-6 mb-6">
            <h3 className="text-lg font-semibold text-center border-b pb-2 mb-4">
              {donationType === 'Individual Donation' || donationType === 'Custom Donation'
                ? 'DONATION DETAILS'
                : 'PAYMENT DETAILS'}
            </h3>

            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h4 className="text-gray-700 font-medium">Donation Summary</h4>
                <button
                  type="button"
                  onClick={handleEditDonation}
                  className="text-emerald-500 hover:text-emerald-600 text-sm font-medium transition-colors duration-200"
                >
                  Edit Donation
                </button>
              </div>

              <div className="flex justify-between items-center py-2">
                <span className="text-gray-600">Donation Amount</span>
                <span className="font-medium">
                  ₹{getDonationAmount().toLocaleString()}
                </span>
              </div>

              <div className="flex justify-between items-center py-2">
                <span className="text-gray-600">Giving Frequency</span>
                <span className="font-medium">{frequency || 'Yearly'}</span>
              </div>

              <div className="flex justify-between items-center py-2 border-t border-gray-200 mt-2">
                <span className="text-gray-800 font-medium">Donation Total</span>
                <span className="text-gray-800 font-bold">
                  ₹{getDonationAmount().toLocaleString()}
                </span>
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isProcessing}
            className={`w-full ${isProcessing ? 'bg-emerald-400' : 'bg-emerald-600'} text-white py-3 rounded-lg 
              hover:bg-emerald-700 transition-colors duration-300 
              focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 flex justify-center items-center`}
          >
            {isProcessing ? (
              <>
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Processing...
              </>
            ) : (
              'Complete Donation'
            )}
          </button>
        </form>
      </div>
      {isEditModalOpen && <EditDonationModal />}
    </div>
  );
};

export default DonationFormBase;
