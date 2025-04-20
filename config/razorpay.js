const Razorpay = require('razorpay');

module.exports = {
  razorpay: new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET
  }),
  currency: 'INR',
  webhook_secret: process.env.RAZORPAY_WEBHOOK_SECRET
};
