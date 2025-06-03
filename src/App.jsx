import { useState, useEffect } from 'react'
/* eslint-disable no-unused-vars */
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
/* eslint-enable no-unused-vars */
import { Toaster } from 'react-hot-toast'
import './App.css'
import Layout from './components/Layout'
import HomePage from './components/HomePage'
import Login from './components/auth/Login'
import Register from './components/auth/Register'
import Dashboard from './components/dashboard/Dashboard'
import { userService } from './services/supabase'
import IndividualDonationForm from './components/forms/IndividualDonationForm'
import FamilyGroupDonationForm from './components/forms/FamilyGroupDonationForm'
import PaymentStatus from './components/PaymentStatus'
import ForgotPassword from './components/ForgotPassword'
import AboutUs from './components/AboutUs'
import ContactUs from './components/ContactUs'
import IndividualDonationAmountSelector from './components/forms/IndividualDonationAmountSelector'
import ThankYou from './pages/ThankYou'

// Donation Forms
import AdoptCowForm from './components/forms/AdoptCowForm'
import FeedFodderForm from './components/forms/FeedFodderForm'
import GauDaanForm from './components/forms/GauDaanForm'
import CustomDonationForm from './components/forms/CustomDonationForm'
import AdoptCalfForm from './components/forms/AdoptCalfForm'
import PrivacyPolicy from './pages/PrivacyPolicy'
import TermsAndConditions from './pages/TermsAndConditions'
import RefundPolicy from './pages/RefundPolicy'

function App() {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkAuthStatus = async () => {
      try {
        const currentUser = await userService.getCurrentUser();
        if (currentUser) {
          setUser(currentUser);
        }
      } catch (error) {
        console.error('Error checking auth status:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    checkAuthStatus();
  }, []);

  const handleLogin = (userData) => {
    setUser(userData);
  };

  const handleLogout = async () => {
    try {
      await userService.signOut();
      setUser(null);
    } catch (error) {
      console.error('Error during logout:', error);
    }
  };

  return (
    <Router>
      <Layout user={user} onLogout={handleLogout}>
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<Login onLogin={handleLogin} />} />
          <Route path="/register" element={<Register onLogin={handleLogin} />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/about" element={<AboutUs />} />
          <Route path="/contact" element={<ContactUs />} />
          <Route path="/privacy-policy" element={<PrivacyPolicy />} />
          <Route path="/terms-and-conditions" element={<TermsAndConditions />} />
          <Route path="/refund-policy" element={<RefundPolicy />} />
          
          {/* Donation Routes */}
          <Route path="/donate/amount" element={<IndividualDonationAmountSelector />} />
          <Route path="/donate/individual" element={<IndividualDonationForm />} />
          <Route path="/donate/family" element={<FamilyGroupDonationForm />} />
          <Route path="/donate/adopt-cow-premium" element={<AdoptCowForm />} />
          <Route path="/donate/adopt-cow-standard" element={<AdoptCowForm />} />
          <Route path="/donate/adopt-calf" element={<AdoptCalfForm />} />
          <Route path="/donate/feed-fodder-yearly" element={<FeedFodderForm />} />
          <Route path="/donate/gau-daan-yearly" element={<GauDaanForm />} />
          <Route path="/donate/custom-amount" element={<CustomDonationForm />} />
          <Route path="/thank-you" element={<ThankYou />} />
          
          {/* Protected Routes */}
          <Route 
            path="/dashboard" 
            element={isLoading ? (
              <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-emerald-100 flex items-center justify-center">
                <div className="text-center">
                  <svg className="animate-spin h-10 w-10 text-emerald-600 mx-auto mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <p className="text-emerald-800 font-medium">Loading...</p>
                </div>
              </div>
            ) : <Dashboard />} 
          />
          <Route path="/payment-status" element={<PaymentStatus />} />
        </Routes>
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: '#333',
              color: '#fff',
            },
            success: {
              style: {
                background: '#22c55e',
              },
            },
            error: {
              style: {
                background: '#ef4444',
              },
            },
          }}
        />
      </Layout>
    </Router>
  )
}

export default App
