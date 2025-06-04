import React from 'react';

const TermsAndConditions = () => {
  return (
    <div className="min-h-screen bg-gray-100">
      {/* Main Content */}
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <h1 className="text-3xl md:text-4xl font-bold text-gray-800 mb-8">Terms and Conditions</h1>
        
        <div className="space-y-6 text-gray-600">
          <p className="leading-relaxed">
            Welcome to the official website of Gomantak Gausevak Mahasangh (https://donate.gomantakgausevak.com/). 
            By accessing or using this website, you agree to comply with and be bound by the following Terms and Conditions. 
            If you do not agree with these terms, please refrain from using our website.
          </p>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold text-gray-800">General Terms</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>This website is owned and operated by Gomantak Gausevak Mahasangh.</li>
              <li>The content on this website, including text, images, and videos, is for informational and donation purposes only.</li>
              <li>We reserve the right to modify, update, or discontinue any part of this website without prior notice.</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold text-gray-800">Donations</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>All donations made through this website are voluntary and non-refundable.</li>
              <li>Donations are used for the welfare of cows, maintenance of the goshala, and other charitable activities.</li>
              <li>We do not store any payment details. All transactions are securely processed through third-party payment gateways.</li>
              <li>Donors are responsible for providing accurate information while making donations.</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold text-gray-800">User Responsibilities</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>Users must not engage in any unlawful, fraudulent, or harmful activities on this website.</li>
              <li>Unauthorized use of this website may result in legal action.</li>
              <li>You agree not to attempt to access restricted sections of the website or interfere with its security features.</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold text-gray-800">Intellectual Property</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>All content, logos, and materials on this website are the property of Gomantak Gausevak Mahasangh and are protected by copyright and trademark laws.</li>
              <li>You may not reproduce, distribute, or use any content from this website without prior written permission.</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold text-gray-800">Privacy Policy</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>We are committed to protecting your privacy. Please refer to our Privacy Policy for details on how we collect, use, and protect your personal data.</li>
              <li>By using this website, you consent to the collection and use of your information as outlined in our Privacy Policy.</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold text-gray-800">Limitation of Liability</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>We strive to provide accurate and updated information, but we do not guarantee the completeness or reliability of any content.</li>
              <li>We shall not be liable for any loss or damage resulting from the use of this website or reliance on its content.</li>
              <li>This website may contain links to third-party websites. We do not endorse or take responsibility for their content or policies.</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold text-gray-800">Governing Law</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>These Terms and Conditions shall be governed and construed in accordance with the laws of India.</li>
              <li>Any disputes arising from the use of this website shall be subject to the exclusive jurisdiction of the courts in Goa.</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold text-gray-800">Contact Information</h2>
            <p>If you have any questions or concerns regarding these Terms and Conditions, please contact us at:</p>
            <div className="pl-6 space-y-2">
              <p className="font-medium">Gomantak Gausevak Mahasangh</p>
              <p>📧 Email: goshalasikeri@gmail.com</p>
              <p>🌐 Website: https://donate.gomantakgausevak.com</p>
            </div>
          </section>

          <p className="text-center text-gray-500 mt-8">
            Thank you for supporting Gomantak Gausevak Mahasangh.
          </p>
        </div>
      </div>
    </div>
  );
};

export default TermsAndConditions;
