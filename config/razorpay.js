const Razorpay = require('razorpay');

// Initialize Razorpay instance only when needed (lazy loading)
let razorpayInstance = null;

const getRazorpayInstance = () => {
  if (!razorpayInstance) {
    razorpayInstance = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET
    });
  }
  return razorpayInstance;
};

module.exports = {
  getRazorpay: getRazorpayInstance,
  currency: 'INR',
  webhook_secret: process.env.RAZORPAY_WEBHOOK_SECRET
};
