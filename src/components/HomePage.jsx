import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import FamilyRegistrationModal from './auth/FamilyRegistrationModal';

const HomePage = () => {
  const [isRegistrationOpen, setIsRegistrationOpen] = useState(false);

  const handleFamilyDonationClick = (e) => {
    e.preventDefault();
    setIsRegistrationOpen(true);
  };

  const handleRegistrationSuccess = (userData) => {
    // Store user data in localStorage or context if needed
    localStorage.setItem('user', JSON.stringify(userData));
    toast.success('Registration successful! You can now proceed with your family donation.', {
      duration: 3000,
      position: 'top-center'
    });
    // Redirect to family donation page after a short delay
    setTimeout(() => {
      window.location.href = '/donate/family';
    }, 1500);
  };
  const [customAmount, setCustomAmount] = useState(0);
  return (
    <div>
      {/* Hero Section */}
      <section className="relative bg-gradient-to-r from-emerald-500 to-emerald-700 text-white">
        <div className="absolute inset-0 bg-black opacity-50"></div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-32">
          <div className="text-center">
            <h1 className="text-4xl md:text-6xl font-bold mb-6">
              Support Our Sacred Cows
        </h1>
            <p className="text-xl md:text-2xl mb-8 max-w-3xl mx-auto">
              Join us in protecting and nurturing our precious Gau Mata through your generous contributions
            </p>
            <div className="flex flex-wrap justify-center gap-4">
            <Link 
              to="/donate/individual"
                className="bg-emerald-600 text-white px-6 py-3 rounded-lg hover:bg-emerald-700 transition-colors"
              >
                Individual Donation
              </Link>
              <Link
                to="#"
                onClick={handleFamilyDonationClick}
                className="bg-emerald-600 text-white px-6 py-3 rounded-lg hover:bg-emerald-700 transition-colors"
              >
                Family Group Donation
              </Link>
              
              <FamilyRegistrationModal 
                isOpen={isRegistrationOpen}
                onClose={() => setIsRegistrationOpen(false)}
                onRegisterSuccess={handleRegistrationSuccess}
              />
            </div>
          </div>
        </div>
      </section>

      {/* Donation Options */}
      <section className="py-20 bg-gray-50 hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center mb-12">Ways to Contribute</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-8">
            <div className="bg-white p-6 rounded-xl shadow-md hover:shadow-lg transition duration-300">
              <div className="text-emerald-500 text-4xl mb-4">🐄</div>
              <h3 className="text-xl font-semibold mb-2">Adopt a Cow</h3>
              <p className="text-gray-600 mb-2">Support the nurturing of our young calves through adoption.</p>
              <div className="text-xl font-bold text-emerald-600 mb-4">₹36,500</div>
              <div className="text-sm text-gray-500 mb-4">Yearly</div>
              <Link
                to="/donate/adopt-cow-premium"
                className="inline-block bg-emerald-500 text-white px-6 py-2 rounded-lg hover:bg-emerald-600 transition duration-300 w-full text-center"
            >
              Donate Now
            </Link>
          </div>

            <div className="bg-white p-6 rounded-xl shadow-md hover:shadow-lg transition duration-300">
              <div className="text-emerald-500 text-4xl mb-4">🐄</div>
              <h3 className="text-xl font-semibold mb-2">Adopt a Calf</h3>
              <p className="text-gray-600 mb-2">Support the nurturing of our young calves through adoption.</p>
              <div className="text-xl font-bold text-emerald-600 mb-4">₹18,500</div>
              <div className="text-sm text-gray-500 mb-4">Yearly</div>
            <Link 
                to="/donate/adopt-cow-standard"
                className="inline-block bg-emerald-500 text-white px-6 py-2 rounded-lg hover:bg-emerald-600 transition duration-300 w-full text-center"
            >
                Donate Now
            </Link>
          </div>
            <div className="bg-white p-6 rounded-xl shadow-md hover:shadow-lg transition duration-300">
              <div className="text-emerald-500 text-4xl mb-4">🌾</div>
              <h3 className="text-xl font-semibold mb-2">Feed Fodder</h3>
              <p className="text-gray-600 mb-2">Contribute to providing nutritious food for our cows.</p>
              <div className="text-xl font-bold text-emerald-600 mb-4">₹500</div>
              <div className="text-sm text-gray-500 mb-4">Yearly</div>
            <Link 
                to="/donate/feed-fodder-yearly"
                className="inline-block bg-emerald-500 text-white px-6 py-2 rounded-lg hover:bg-emerald-600 transition duration-300 w-full text-center"
              >
                Donate Now
              </Link>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-md hover:shadow-lg transition duration-300">
              <div className="text-emerald-500 text-4xl mb-4">🙏</div>
              <h3 className="text-xl font-semibold mb-2">Gau Daan</h3>
              <p className="text-gray-600 mb-2">Make a sacred contribution to cow protection.</p>
              <div className="text-xl font-bold text-emerald-600 mb-4">₹10,000</div>
              <div className="text-sm text-gray-500 mb-4">Yearly</div>
              <Link
                to="/donate/gau-daan-yearly"
                className="inline-block bg-emerald-500 text-white px-6 py-2 rounded-lg hover:bg-emerald-600 transition duration-300 w-full text-center"
              >
                Donate Now
              </Link>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-md hover:shadow-lg transition duration-300">
              <div className="text-emerald-500 text-4xl mb-4">💝</div>
              <h3 className="text-xl font-semibold mb-2">Custom Donation</h3>
              <p className="text-gray-600 mb-2">Choose your own way to support our cause.</p>
              <div className="mb-4">
                <input
                  type="number"
                  min="100"
                  placeholder="Enter amount"
                  value={customAmount || ''}
                  onChange={(e) => setCustomAmount(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all text-center text-lg font-medium"
                />
              </div>
              <div className="text-sm text-gray-500 mb-4 text-center">Minimum amount: ₹100</div>
              <Link
                to="/donate/custom-amount"
                className={`inline-block px-6 py-2 rounded-lg transition duration-300 w-full text-center ${customAmount >= 100 ? 'bg-emerald-500 hover:bg-emerald-600 text-white' : 'bg-gray-200 text-gray-400 cursor-not-allowed'}`}
                onClick={(e) => customAmount < 100 && e.preventDefault()}
              >
                Donate Now
            </Link>
          </div>
        </div>
      </div>
      </section>

      {/* Impact Section */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center mb-12">Our Impact</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
            <div>
              <div className="text-4xl font-bold text-emerald-500 mb-2">1000+</div>
              <div className="text-xl text-gray-600">Cows Protected</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-emerald-500 mb-2">5000+</div>
              <div className="text-xl text-gray-600">Donors</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-emerald-500 mb-2">10+</div>
              <div className="text-xl text-gray-600">Years of Service</div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-emerald-50 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold mb-4">Ready to Make a Difference?</h2>
          <p className="text-xl text-gray-600 mb-8">
            Your contribution can help us provide better care for our cows
          </p>
          <Link
            to="/donate/individual"
            className="bg-emerald-500 text-white px-8 py-3 rounded-full font-semibold hover:bg-emerald-600 transition duration-300"
          >
            Donate Now
          </Link>
        </div>  
      </section>    </div>
  );
};

export default HomePage;
