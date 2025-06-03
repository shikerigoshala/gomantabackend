import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import donationService from '../services/donationService';
import { toast } from 'react-hot-toast';

const DonationForm = ({ amount, onClose }) => {
  const [formType, setFormType] = useState('individual');
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    familyMembers: [],
    address: '',
    addressLine1: '',
    addressLine2: '',
    city: '',
    state: 'Goa',
    zipCode: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  
  // Convert amount to rupees if it's in paise (amount >= 1000)
  const displayAmount = (typeof amount === 'string' && amount.length >= 3) 
    ? (parseInt(amount) / 100) 
    : (typeof amount === 'number' && amount >= 1000) 
      ? amount / 100 
      : parseInt(amount) || 0;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      // Validate required fields
      const requiredFields = {
        firstName: 'First Name',
        lastName: 'Last Name',
        email: 'Email',
        phone: 'Phone Number',
        addressLine1: 'Address Line 1',
        city: 'City',
        zipCode: 'Zip Code'
      };

      const missingFields = Object.entries(requiredFields)
        .filter(([key]) => !formData[key])
        .map(([, label]) => label);

      if (missingFields.length > 0) {
        toast.error(`Please fill in: ${missingFields.join(', ')}`);
        return;
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email)) {
        toast.error('Please enter a valid email address');
        return;
      }

      // Validate phone number (10 digits)
      const phoneRegex = /^\d{10}$/;
      if (!phoneRegex.test(formData.phone)) {
        toast.error('Please enter a valid 10-digit phone number');
        return;
      }

      // Prepare donor information
      const donorInfo = {
        name: `${formData.firstName.trim()} ${formData.lastName.trim()}`,
        email: formData.email.toLowerCase().trim(),
        phone: formData.phone.trim(),
        address: [
          formData.addressLine1?.trim(),
          formData.addressLine2?.trim(),
          formData.city?.trim(),
          formData.state,
          formData.zipCode?.trim()
        ].filter(Boolean).join(', ')
      };

      // Show loading toast
      const loadingToast = toast.loading('Initiating payment...');

      try {
        // Create donation
        const response = await donationService.createDonation({
          amount: parseInt(amount, 10),
          donorInfo,
          donationType: formType,
          ...(formType === 'family' && {
            familyInfo: formData.familyMembers.map(member => ({
              ...member,
              name: member.name.trim()
            }))
          })
        });

        // Dismiss loading toast
        toast.dismiss(loadingToast);

        // Handle payment URL
        if (response?.paymentUrl) {
          // Show success message
          toast.success('Redirecting to payment gateway...', {
            duration: 2000
          });
          
          // Small delay to show the success message
          setTimeout(() => {
            window.location.href = response.paymentUrl;
          }, 1500);
        } else {
          throw new Error('Payment URL not received from server');
        }
      } catch (error) {
        // Dismiss loading toast
        toast.dismiss(loadingToast);

        // Log the error for debugging
        console.error('Payment initialization error:', {
          message: error.message,
          response: error.response?.data,
          status: error.response?.status
        });

        // Show error message
        toast.error(
          error.response?.data?.message ||
          error.message ||
          'Failed to initialize payment. Please try again.'
        );

        throw error;
      }
    } catch (error) {
      console.error('Form submission error:', error);
      setIsLoading(false);
    }
  };

  const addFamilyMember = () => {
    setFormData(prev => ({
      ...prev,
      familyMembers: [
        ...prev.familyMembers,
        { name: '', age: '', relation: '', email: '' }
      ]
    }));
  };

  const updateFamilyMember = (index, field, value) => {
    setFormData(prev => {
      const newMembers = [...prev.familyMembers];
      newMembers[index][field] = value;
      // Validate email format
      if (field === 'email') {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(value)) {
          toast.error('Please enter a valid email address');
          return prev;
        }
      }
      return {
        ...prev,
        familyMembers: newMembers
      };
    });
  };

  const removeFamilyMember = (index) => {
    setFormData(prev => ({
      ...prev,
      familyMembers: prev.familyMembers.filter((_, i) => i !== index)
    }));
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center overflow-y-auto">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl my-8">
        <div className="flex flex-col space-y-4 mb-6">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Add Your Information</h2>
            <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          <div className="flex justify-center space-x-4">
            <button
              type="button"
              onClick={() => setFormType('individual')}
              className={`px-4 py-2 rounded-full ${formType === 'individual' ? 'bg-emerald-500 text-white' : 'bg-gray-200'}`}
            >
              Individual Donation
            </button>
            <button
              type="button"
              onClick={() => setFormType('family')}
              className={`px-4 py-2 rounded-full ${formType === 'family' ? 'bg-emerald-500 text-white' : 'bg-gray-200'}`}
            >
              Family Group Donation
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <input
              type="text"
              name="firstName"
              value={formData.firstName}
              onChange={handleChange}
              placeholder="First Name*"
              className="border rounded-md p-2 focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              required
            />
            <input
              type="text"
              name="lastName"
              value={formData.lastName}
              onChange={handleChange}
              placeholder="Last Name"
              className="border rounded-md p-2 focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            />
          </div>

          <input
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            placeholder="Email Address*"
            className="w-full border rounded-md p-2"
            required
          />

          <input
            type="tel"
            name="phone"
            value={formData.phone}
            onChange={handleChange}
            placeholder="10 Digit Mobile Number"
            className="w-full border rounded-md p-2"
            pattern="[0-9]{10}"
          />

          {formType === 'family' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium">Family Members</h3>
                <button
                  type="button"
                  onClick={addFamilyMember}
                  className="text-emerald-500 hover:text-emerald-600"
                >
                  + Add Member
                </button>
              </div>
              {formData.familyMembers.map((member, index) => (
                <div key={index} className="grid grid-cols-3 gap-4 items-center">
                  <input
                    type="text"
                    value={member.name}
                    onChange={(e) => updateFamilyMember(index, 'name', e.target.value)}
                    placeholder="Name"
                    className="border rounded-md p-2 focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  />
                  <input
                    type="number"
                    value={member.age}
                    onChange={(e) => updateFamilyMember(index, 'age', e.target.value)}
                    placeholder="Age"
                    className="border rounded-md p-2 focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  />
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={member.relation}
                      onChange={(e) => updateFamilyMember(index, 'relation', e.target.value)}
                      placeholder="Relation"
                      className="border rounded-md p-2 flex-grow focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    />
                    <button
                      type="button"
                      onClick={() => removeFamilyMember(index)}
                      className="text-red-500 hover:text-red-600"
                    >
                      ×
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <textarea
            name="address"
            value={formData.address}
            onChange={handleChange}
            placeholder="Customer Address"
            className="w-full border rounded-md p-2 h-24 focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
          />

          <select
            name="country"
            className="w-full border rounded-md p-2"
            defaultValue="India"
          >
            <option value="India">India</option>
          </select>

          <input
            type="text"
            name="addressLine1"
            value={formData.addressLine1}
            onChange={handleChange}
            placeholder="Address line 1*"
            className="w-full border rounded-md p-2"
            required
          />

          <input
            type="text"
            name="addressLine2"
            value={formData.addressLine2}
            onChange={handleChange}
            placeholder="Address line 2"
            className="w-full border rounded-md p-2"
          />

          <input
            type="text"
            name="city"
            value={formData.city}
            onChange={handleChange}
            placeholder="City*"
            className="w-full border rounded-md p-2"
            required
          />

          <div className="grid grid-cols-2 gap-4">
            <select
              name="state"
              value={formData.state}
              onChange={handleChange}
              className="border rounded-md p-2"
            >
              <option value="Goa">Goa</option>
              {/* Add other states as needed */}
            </select>

            <input
              type="text"
              name="zipCode"
              value={formData.zipCode}
              onChange={handleChange}
              placeholder="Zip / Postal Code*"
              className="border rounded-md p-2"
              required
            />
          </div>

          <div className="mt-6">
            <h3 className="text-lg font-semibold mb-4">PAYMENT DETAILS</h3>
            <div className="bg-gray-50 p-4 rounded-md">
              <div className="flex justify-between mb-2">
                <span>Payment Amount</span>
                <span>₹{displayAmount.toLocaleString()}</span>
              </div>
              <div className="flex justify-between mb-2">
                <span>Giving Frequency</span>
                <span>Yearly</span>
              </div>
              <div className="flex justify-between font-semibold">
                <span>Donation Total</span>
                <span>₹{displayAmount.toLocaleString()}</span>
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className={`w-full flex justify-center items-center bg-emerald-500 text-white py-3 rounded-md hover:bg-emerald-600 transition duration-300 ${isLoading ? 'opacity-70 cursor-not-allowed' : ''}`}
          >
            {isLoading ? (
              <>
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Processing...
              </>
            ) : 'Complete Donation'}
          </button>

          <div className="text-center mt-4">
            <span className="text-gray-500 text-sm flex items-center justify-center">
              <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                <path d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 116 0z"/>
              </svg>
              Secure Donation
            </span>
          </div>
        </form>
      </div>
    </div>
  );
};

export default DonationForm;
