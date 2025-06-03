import React from 'react';

const AboutUs = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-emerald-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            About Gomantak Gausevak
          </h1>
          <p className="text-lg text-gray-600 max-w-3xl mx-auto">
            Dedicated to the welfare and protection of cows through sustainable practices and community engagement
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-16">
          <div className="bg-white rounded-xl shadow-md p-6 hover:shadow-lg transition duration-300">
            <div className="text-emerald-600 mb-4">
              <svg className="h-12 w-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"/>
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Our Mission</h3>
            <p className="text-gray-600">
              To protect and care for cows while promoting sustainable farming practices and traditional values
            </p>
          </div>

          <div className="bg-white rounded-xl shadow-md p-6 hover:shadow-lg transition duration-300">
            <div className="text-emerald-600 mb-4">
              <svg className="h-12 w-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Our Values</h3>
            <p className="text-gray-600">
              Compassion, sustainability, and respect for all living beings guide our every action
            </p>
          </div>

          <div className="bg-white rounded-xl shadow-md p-6 hover:shadow-lg transition duration-300">
            <div className="text-emerald-600 mb-4">
              <svg className="h-12 w-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"/>
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Our Impact</h3>
            <p className="text-gray-600">
              Making a difference in cow welfare through community support and sustainable practices
            </p>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          <div className="grid grid-cols-1 md:grid-cols-2">
            <div className="p-8 md:p-12">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">Our Story</h2>
              <div className="space-y-4 text-gray-600">
                <p>
                  Founded with a vision to protect and serve cows, Gomantak Gausevak has grown into a community of dedicated individuals committed to animal welfare and sustainable practices.
                </p>
                <p>
                  We believe in creating a harmonious relationship between humans and cows, promoting traditional values while embracing modern sustainable practices.
                </p>
                <p>
                  Through various initiatives like cow adoption, fodder programs, and educational outreach, we continue to make a positive impact on both the lives of cows and our community.
                </p>
              </div>
            </div>
            <div className="relative h-64 md:h-auto">
              <div className="absolute inset-0 bg-emerald-600">
                <div className="h-full w-full object-cover opacity-20 bg-pattern"></div>
              </div>
              <div className="absolute inset-0 flex items-center justify-center text-white">
                <div className="text-center px-6">
                  <h3 className="text-2xl font-bold mb-4">Join Our Mission</h3>
                  <p className="mb-6">Be part of our journey in protecting and serving cows</p>
                  <button className="bg-white text-emerald-600 px-6 py-2 rounded-md font-medium hover:bg-emerald-50 transition duration-300">
                    Get Involved
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AboutUs;
