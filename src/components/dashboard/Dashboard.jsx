import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { userService, donationService } from '../../services/supabase';
import { toast } from 'react-hot-toast';
import { 
  FiEdit, 
  FiSave, 
  FiX,
  FiUser, 
  FiClock, 
  FiHome, 
  FiHeart,
  FiArrowRight
} from 'react-icons/fi';

const Dashboard = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [donations, setDonations] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [isEditing, setIsEditing] = useState(false);
  const [profileData, setProfileData] = useState({
    name: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    pincode: '',
    country: 'India'
  });

  useEffect(() => {
    const checkAuth = async () => {
      try {
        setIsLoading(true);
        const currentUser = await userService.getCurrentUser();
        
        if (!currentUser || !currentUser.email) {
          console.log('No authenticated user found, redirecting to login');
          navigate('/login');
          return;
        }
        
        console.log('Current user:', currentUser);
        
        // Set basic user data first
        const userToSet = {
          ...currentUser,
          name: currentUser.user_metadata?.name || currentUser.email.split('@')[0],
          email: currentUser.email,
          phone: currentUser.user_metadata?.phone || '',
          created_at: currentUser.created_at || new Date().toISOString()
        };
        
        setUser(userToSet);
        
        // Try to get additional user data from the users table
        try {
          const userData = await userService.getUserByEmail(currentUser.email);
          console.log('User data from DB:', userData);
          
          if (userData) {
            const fullName = userData.name || 
              (userData.first_name ? `${userData.first_name} ${userData.last_name || ''}`.trim() : null) || 
              currentUser.user_metadata?.name || 
              currentUser.email.split('@')[0];
            
            const updatedUser = {
              ...userToSet,
              ...userData,
              name: fullName,
              // Ensure we don't override with empty values from the database
              phone: userData.phone || userToSet.phone,
              email: userData.email || userToSet.email
            };
            
            setUser(updatedUser);
            
            // Set profile data for editing
            setProfileData({
              name: fullName,
              phone: userData.phone || '',
              address: userData.address || '',
              city: userData.city || '',
              state: userData.state || '',
              pincode: userData.pincode || '',
              country: userData.country || 'India'
            });
          } else {
            // If no user data in the users table, initialize with auth data
            setProfileData({
              name: userToSet.name,
              phone: userToSet.phone || '',
              address: '',
              city: '',
              state: '',
              pincode: '',
              country: 'India'
            });
          }
        } catch (userDataError) {
          console.error('Error fetching user data from DB:', userDataError);
          // Continue with just the auth data
          setProfileData({
            name: userToSet.name,
            phone: userToSet.phone || '',
            address: '',
            city: '',
            state: '',
            pincode: '',
            country: 'India'
          });
        }
        
        // Fetch donations
        try {
          const userDonations = await donationService.getUserDonations();
          setDonations(userDonations || []);
        } catch (donationError) {
          console.error('Error fetching donations:', donationError);
          setDonations([]);
        }
        
      } catch (error) {
        console.error('Authentication check failed:', error);
        toast.error('Failed to load user data. Please try again.');
        navigate('/login');
      } finally {
        setIsLoading(false);
      }
    };
    
    checkAuth();
  }, [navigate]);

 

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-emerald-100 flex items-center justify-center">
        <div className="text-center">
          <svg className="animate-spin h-10 w-10 text-emerald-600 mx-auto mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p className="text-emerald-800 font-medium">Loading your dashboard...</p>
        </div>
      </div>
    );
  }
  
  if (!user) {
    navigate('/login');
    return null;
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setProfileData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleProfileUpdate = async () => {
    try {
      setIsLoading(true);
      const updatedUser = await userService.updateProfile({
        name: profileData.name,
        phone: profileData.phone,
        address: profileData.address,
        city: profileData.city,
        state: profileData.state,
        pincode: profileData.pincode,
        country: profileData.country
      });
      
      setUser(prev => ({
        ...prev,
        ...updatedUser,
        name: profileData.name
      }));
      
      setIsEditing(false);
      toast.success('Profile updated successfully');
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('Failed to update profile. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditClick = () => {
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    // Reset form data to current user data
    setProfileData({
      name: user.name || '',
      phone: user.phone || '',
      address: user.address || '',
      city: user.city || '',
      state: user.state || '',
      pincode: user.pincode || '',
      country: user.country || 'India'
    });
    setIsEditing(false);
  };

  // Format date for display
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    }).format(date);
  };
  
  // Get donation type display name
  const getDonationTypeDisplay = (type) => {
    const typeMap = {
      'individual': 'Individual Donation',
      'cow': 'Adopt a Cow',
      'calf': 'Adopt a Calf',
      'feed': 'Feed & Fodder',
      'family': 'Family Group Donation'
    };
    return typeMap[type] || type;
  };
  
  // Get status badge style
  const getStatusBadgeClass = (status) => {
    switch (status?.toLowerCase()) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-emerald-100">
      {/* <nav className="bg-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-bold text-emerald-800">Welcome, {user.name || user.email}!</h1>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate('/')}
                className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800"
              >
                Home
              </button>
              <button
                onClick={handleLogout}
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav> */}

      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {/* Dashboard Tabs */}
          <div className="border-b border-gray-200 mb-6">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setActiveTab('overview')}
                className={`${activeTab === 'overview' ? 'border-emerald-500 text-emerald-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
              >
                Overview
              </button>
              <button
                onClick={() => setActiveTab('donations')}
                className={`${activeTab === 'donations' ? 'border-emerald-500 text-emerald-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
              >
                Donation History
              </button>
              <button
                onClick={() => setActiveTab('profile')}
                className={`${activeTab === 'profile' ? 'border-emerald-500 text-emerald-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
              >
                Profile
              </button>
            </nav>
          </div>
          
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6">
              <div className="text-center mb-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Welcome Back, {user?.name?.split(' ')[0] || 'Donor'}!</h2>
                <p className="text-gray-600 max-w-2xl mx-auto">
                  Thank you for supporting our cause. Here's a quick overview of your contributions.
                </p>
              </div>
              
              {/* Stats Grid */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 mb-10">
                {/* Total Donations */}
                <div className="bg-gradient-to-br from-emerald-50 to-white p-5 rounded-xl border border-emerald-50 shadow-sm">
                  <div className="flex items-center">
                    <div className="p-3 rounded-lg bg-emerald-100 text-emerald-600 mr-4">
                      <FiHeart className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500">Total Donations</p>
                      <p className="text-2xl font-bold text-gray-900">{donations.length}</p>
                    </div>
                  </div>
                </div>

                {/* Total Amount */}
                <div className="bg-gradient-to-br from-amber-50 to-white p-5 rounded-xl border border-amber-50 shadow-sm">
                  <div className="flex items-center">
                    <div className="p-3 rounded-lg bg-amber-100 text-amber-600 mr-4 text-xl">
                      ₹
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500">Total Contributed</p>
                      <p className="text-2xl font-bold text-gray-900">
                        ₹{donations.reduce((sum, donation) => sum + (parseFloat(donation.amount) || 0), 0).toLocaleString('en-IN')}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Last Donation */}
                <div className="bg-gradient-to-br from-blue-50 to-white p-5 rounded-xl border border-blue-50 shadow-sm">
                  <div className="flex items-center">
                    <div className="p-3 rounded-lg bg-blue-100 text-blue-600 mr-4">
                      <FiClock className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500">Last Donation</p>
                      <p className="text-xl font-bold text-gray-900">
                        {donations.length > 0 ? formatDate(donations[0].created_at) : '—'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Action Cards */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Make a Donation Card */}
                <div className="lg:col-span-2 bg-gradient-to-br from-emerald-50 to-white p-6 rounded-xl border border-emerald-50 shadow-sm">
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Make a Donation</h3>
                  <p className="text-gray-600 mb-6">
                    Your generosity helps us continue our mission. Choose how you'd like to contribute:
                  </p>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <button
                      onClick={() => navigate('/donate/individual')}
                      className="group flex flex-col items-center justify-center p-4 rounded-lg border-2 border-dashed border-emerald-200 hover:border-emerald-300 bg-white hover:bg-emerald-50 transition-all duration-200"
                    >
                      <div className="p-3 rounded-full bg-emerald-100 text-emerald-600 mb-3 group-hover:bg-emerald-200 transition-colors">
                        <FiUser className="w-5 h-5" />
                      </div>
                      <span className="font-medium text-gray-900">Individual Donation</span>
                      <span className="text-xs text-gray-500 mt-1">One-time contribution</span>
                    </button>
                    
                    <button
                      onClick={() => navigate('/donate/family')}
                      className="group flex flex-col items-center justify-center p-4 rounded-lg border-2 border-dashed border-amber-200 hover:border-amber-300 bg-white hover:bg-amber-50 transition-all duration-200"
                    >
                      <div className="p-3 rounded-full bg-amber-100 text-amber-600 mb-3 group-hover:bg-amber-200 transition-colors">
                        <FiHome className="w-5 h-5" />
                      </div>
                      <span className="font-medium text-gray-900">Family Group Donation</span>
                      <span className="text-xs text-gray-500 mt-1">For your entire family</span>
                    </button>
                  </div>
                </div>

                {/* Recent Activity */}
                <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">Recent Activity</h3>
                    {donations.length > 3 && (
                      <button 
                        onClick={() => setActiveTab('donations')}
                        className="text-sm font-medium text-emerald-600 hover:text-emerald-700 flex items-center"
                      >
                        View All
                        <FiArrowRight className="ml-1 w-4 h-4" />
                      </button>
                    )}
                  </div>
                  
                  {donations.length > 0 ? (
                    <div className="space-y-4">
                      {donations.slice(0, 3).map((donation, index) => (
                        <div 
                          key={index} 
                          className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors"
                        >
                          <div className="flex items-center">
                            <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600 mr-3">
                              {donation.type === 'family' ? (
                                <FiHome className="w-4 h-4" />
                              ) : donation.type === 'gau_seva' ? (
                                <FiHeart className="w-4 h-4" />
                              ) : (
                                <FiUser className="w-4 h-4" />
                              )}
                            </div>
                            <div>
                              <p className="text-sm font-medium text-gray-900">
                                {getDonationTypeDisplay(donation.type)}
                              </p>
                              <p className="text-xs text-gray-500">
                                {formatDate(donation.created_at)}
                              </p>
                            </div>
                          </div>
                          <span className="font-semibold text-emerald-700">
                            ₹{parseFloat(donation.amount).toLocaleString('en-IN')}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <div className="mx-auto w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 mb-3 text-2xl">
                        ₹
                      </div>
                      <p className="text-gray-500">No donations yet</p>
                      <button
                        onClick={() => navigate('/donate/individual')}
                        className="mt-3 text-sm font-medium text-emerald-600 hover:text-emerald-700"
                      >
                        Make your first donation
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
          
          {/* Donations History Tab */}
          {activeTab === 'donations' && (
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h2 className="text-xl font-semibold text-emerald-800 mb-6">Your Donation History</h2>
              
              {donations.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {donations.map((donation, index) => (
                        <tr key={index}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatDate(donation.created_at)}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{getDonationTypeDisplay(donation.type)}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">₹{parseFloat(donation.amount).toLocaleString()}</td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadgeClass(donation.status)}`}>
                              {donation.status || 'Unknown'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-10">
                  <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No donations</h3>
                  <p className="mt-1 text-sm text-gray-500">Get started by making your first donation.</p>
                  <div className="mt-6">
                    <button
                      onClick={() => navigate('/donate')}
                      className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500"
                    >
                      Make a Donation
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
          
          {/* Profile Tab */}
          {activeTab === 'profile' && (
            <div className="bg-white rounded-lg shadow-lg p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold text-emerald-800">Your Profile</h2>
                {!isEditing ? (
                  <button
                    onClick={handleEditClick}
                    className="inline-flex items-center px-3 py-1.5 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500"
                  >
                    <FiEdit className="-ml-0.5 mr-2 h-4 w-4" />
                    Edit Profile
                  </button>
                ) : (
                  <div className="space-x-2">
                    <button
                      onClick={handleCancelEdit}
                      className="inline-flex items-center px-3 py-1.5 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500"
                    >
                      <FiX className="-ml-0.5 mr-2 h-4 w-4" />
                      Cancel
                    </button>
                    <button
                      onClick={handleProfileUpdate}
                      disabled={isLoading}
                      className="inline-flex items-center px-3 py-1.5 border border-transparent text-sm leading-4 font-medium rounded-md shadow-sm text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 disabled:opacity-50"
                    >
                      <FiSave className="-ml-0.5 mr-2 h-4 w-4" />
                      {isLoading ? 'Saving...' : 'Save Changes'}
                    </button>
                  </div>
                )}
              </div>
              
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Personal Information</h3>
                  <dl className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2">
                    <div className="sm:col-span-2">
                      <dt className="text-sm font-medium text-gray-500">Full name</dt>
                      {isEditing ? (
                        <input
                          type="text"
                          name="name"
                          value={profileData.name}
                          onChange={handleInputChange}
                          className="block w-full rounded-md border-gray-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 sm:text-sm px-3 py-2 placeholder-gray-400"
                        />
                      ) : (
                        <dd className="text-sm text-gray-900">{user.name || 'Not provided'}</dd>
                      )}
                    </div>
                    <div className="sm:col-span-2">
                      <dt className="text-sm font-medium text-gray-500">Email address</dt>
                      <dd className="mt-1 text-sm text-gray-900">{user.email}</dd>
                    </div>
                    <div className="sm:col-span-2">
                      <dt className="text-sm font-medium text-gray-500">Phone number</dt>
                      {isEditing ? (
                        <input
                          type="tel"
                          name="phone"
                          value={profileData.phone}
                          onChange={handleInputChange}
                          className="block w-full rounded-md border-gray-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 sm:text-sm px-3 py-2 placeholder-gray-400"
                          placeholder="Enter your phone number"
                        />
                      ) : (
                        <dd className="mt-1 text-sm text-gray-900">{user.phone || 'Not provided'}</dd>
                      )}
                    </div>
                    <div className="sm:col-span-2">
                      <dt className="text-sm font-medium text-gray-500">Member since</dt>
                      <dd className="mt-1 text-sm text-gray-900">{formatDate(user.created_at)}</dd>
                    </div>
                  </dl>
                </div>
                
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Address Information</h3>
                  <dl className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2">
                    <div className="sm:col-span-2">
                      <dt className="text-sm font-medium text-gray-500">Address</dt>
                      {isEditing ? (
                        <input
                          type="text"
                          name="address"
                          value={profileData.address}
                          onChange={handleInputChange}
                          className="block w-full rounded-md border-gray-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 sm:text-sm px-3 py-2 placeholder-gray-400"
                          placeholder="Enter your address"
                        />
                      ) : (
                        <dd className="mt-1 text-sm text-gray-900">{user.address || 'Not provided'}</dd>
                      )}
                    </div>
                    <div className="sm:col-span-1">
                      <dt className="text-sm font-medium text-gray-500">City</dt>
                      {isEditing ? (
                        <input
                          type="text"
                          name="city"
                          value={profileData.city}
                          onChange={handleInputChange}
                          className="block w-full rounded-md border-gray-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 sm:text-sm px-3 py-2 placeholder-gray-400"
                          placeholder="City"
                        />
                      ) : (
                        <dd className="mt-1 text-sm text-gray-900">{user.city || 'Not provided'}</dd>
                      )}
                    </div>
                    <div className="sm:col-span-1">
                      <dt className="text-sm font-medium text-gray-500">State</dt>
                      {isEditing ? (
                        <input
                          type="text"
                          name="state"
                          value={profileData.state}
                          onChange={handleInputChange}
                          className="block w-full rounded-md border-gray-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 sm:text-sm px-3 py-2 placeholder-gray-400"
                          placeholder="State"
                        />
                      ) : (
                        <dd className="mt-1 text-sm text-gray-900">{user.state || 'Not provided'}</dd>
                      )}
                    </div>
                    <div className="sm:col-span-1">
                      <dt className="text-sm font-medium text-gray-500">Country</dt>
                      {isEditing ? (
                        <select
                          name="country"
                          value={profileData.country}
                          onChange={handleInputChange}
                          className="block w-full rounded-md border-gray-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 sm:text-sm px-3 py-2 placeholder-gray-400"
                        >
                          <option value="India">India</option>
                          <option value="Other">Other</option>
                        </select>
                      ) : (
                        <dd className="text-sm text-gray-900">{user.country || 'India'}</dd>
                      )}
                    </div>
                    <div className="sm:col-span-1">
                      <dt className="text-sm font-medium text-gray-500">PIN Code</dt>
                      {isEditing ? (
                        <div className="mt-1">
                          <input
                            type="text"
                            name="pincode"
                            value={profileData.pincode}
                            onChange={handleInputChange}
                            placeholder="Enter your PIN code"
                            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 sm:text-sm px-3 py-2 placeholder-gray-400"
                            required
                          />
                        </div>
                      ) : (
                        <dd className="mt-1 text-sm text-gray-900">{user.pincode || 'Not provided'}</dd>
                      )}
                    </div>
                  </dl>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
