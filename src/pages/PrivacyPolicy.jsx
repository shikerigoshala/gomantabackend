import React from 'react';

const PrivacyPolicy = () => {
  return (
    <div className="min-h-screen bg-gray-100">
      {/* Main Content */}
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <h1 className="text-3xl md:text-4xl font-bold text-gray-800 mb-8">Privacy Policy</h1>
        
        <div className="space-y-6 text-gray-600">
          <p className="leading-relaxed">
            Gomantak Gausevak Mahasangh ("we," "our," or "us") values your privacy and is committed to protecting any personal information you share with us. This Privacy Policy explains how we collect, use, and protect your data when you visit our website https://donate.gomantakgausevak.com/ or interact with us.
          </p>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold text-gray-800">Information We Collect</h2>
            <p>We may collect the following types of information when you use our website:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Personal Information: Name, email address, phone number, and payment details when you donate or contact us.</li>
              <li>Non-Personal Information: Browser type, IP address, and usage data collected through cookies and analytics tools.</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold text-gray-800">How We Use Your Information</h2>
            <p>We use the collected information for the following purposes:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>To process donations and issue receipts.</li>
              <li>To respond to your inquiries and provide support.</li>
              <li>To send updates about our activities, events, and campaigns (if opted in).</li>
              <li>To improve our website and user experience.</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold text-gray-800">Data Sharing & Security</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>We do not sell, trade, or rent your personal information to third parties.</li>
              <li>Payment transactions are processed securely via trusted payment gateways.</li>
              <li>We implement reasonable security measures to protect your data from unauthorized access.</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold text-gray-800">Cookies & Tracking Technologies</h2>
            <p>Our website may use cookies to enhance user experience. You can disable cookies in your browser settings, but this may affect website functionality.</p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold text-gray-800">Third-Party Links</h2>
            <p>Our website may contain links to third-party sites. We are not responsible for their privacy practices, so we recommend reviewing their policies.</p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold text-gray-800">Your Rights</h2>
            <p>You may request access, correction, or deletion of your personal data by contacting us at goshalasikeri@gmail.com.</p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold text-gray-800">Updates to This Policy</h2>
            <p>We may update this Privacy Policy from time to time. Changes will be posted on this page with an updated effective date.</p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold text-gray-800">Contact Us</h2>
            <p>If you have any questions about this Privacy Policy, please contact us at:</p>
            <div className="pl-6 space-y-2">
              <p>📧 Email: goshalasikeri@gmail.com</p>
              <p>🌐 Website: https://donate.gomantakgausevak.com/</p>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicy;
