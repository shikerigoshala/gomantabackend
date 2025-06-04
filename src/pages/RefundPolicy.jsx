import React from 'react';

const RefundPolicy = () => {
  return (
    <div className="min-h-screen bg-gray-100">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <h1 className="text-3xl md:text-4xl font-bold text-gray-800 mb-8">Refund Policy</h1>
        
        <div className="space-y-6 text-gray-600">
          <section className="space-y-4">
            <h2 className="text-2xl font-semibold text-gray-800">Order Cancellations</h2>
            <p className="leading-relaxed">
              We do not offer returns or refunds once a product has been dispatched. However, if an order is canceled within 24 hours 
              and has not yet been shipped, a refund will be processed. The refund will be issued through the original payment method 
              within 10 working days.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold text-gray-800">Refund Process</h2>
            <p className="leading-relaxed">
              To request a cancellation and refund, please email us at <a href="mailto:goshalasikeri@gmail.com" className="text-blue-600 hover:text-blue-800">goshalasikeri@gmail.com</a> with 
              your order details. Once your request is reviewed and approved, the refund will be initiated.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold text-gray-800">Refund Calculation</h2>
            <p className="leading-relaxed mb-4">
              A 20% deduction (covering shipping and payment processing fees) will be applied to the original payment amount. 
              The remaining amount will be refunded as per the payment method used at the time of purchase:
            </p>

            {/* Refund Table */}
            <div className="overflow-x-auto">
              <table className="min-w-full bg-white rounded-lg overflow-hidden shadow-md">
                <thead className="bg-gray-800 text-white">
                  <tr>
                    <th className="px-6 py-3 text-left">Payment Method</th>
                    <th className="px-6 py-3 text-left">Refund Method</th>
                    <th className="px-6 py-3 text-left">Processing Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  <tr className="hover:bg-gray-50">
                    <td className="px-6 py-4">Credit/Debit Card</td>
                    <td className="px-6 py-4">Same Card Used for Payment</td>
                    <td className="px-6 py-4">8-10 business days</td>
                  </tr>
                  <tr className="hover:bg-gray-50">
                    <td className="px-6 py-4">Net Banking</td>
                    <td className="px-6 py-4">Credited to the Same Bank Account</td>
                    <td className="px-6 py-4">8-10 business days</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <p className="text-sm text-gray-500 mt-4">
              If the refund is not received within the expected timeframe, please check with your bank or card issuer.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold text-gray-800">Contact Us</h2>
            <p className="leading-relaxed">
              For any further queries, feel free to contact us at{' '}
              <a href="mailto:goshalasikeri@gmail.com" className="text-blue-600 hover:text-blue-800">
                goshalasikeri@gmail.com
              </a>
            </p>
          </section>
        </div>
      </div>
    </div>
  );
};

export default RefundPolicy;
