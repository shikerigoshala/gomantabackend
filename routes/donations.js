const express = require('express');
const { 
  initializePayment, 
  checkPaymentStatus, 
  createSdkOrder,
  validateCallback,
  initiateRefund,
  checkRefundStatus,
  generatePaymentRequest,
  createOrder,
  verifyPayment,
  validateWebhookSignature
} = require('../services/payment');
const { donationService } = require('../services/supabase');
const { sendThankYouEmail, sendAdminNotificationEmail } = require('../services/email');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Create a new donation and initialize payment
router.post('/', async (req, res) => {
  try {
    const { amount, donorInfo, donationType } = req.body;
    console.log('💰 Creating donation:', { amount, donorInfo, donationType });

    // Validate request
    if (!amount || typeof amount !== 'number') {
      console.error('❌ Invalid amount:', amount);
      return res.status(400).json({
        success: false,
        message: 'Invalid amount: Amount must be a number'
      });
    }

    if (!donorInfo?.name || !donorInfo?.email) {
      console.error('❌ Invalid donor info:', donorInfo);
      return res.status(400).json({
        success: false,
        message: 'Invalid donor info: Name and email are required'
      });
    }

    // Convert amount to paise for Razorpay
    const amountInPaise = Math.round(amount * 100);
    if (amountInPaise < 100) {
      console.error('❌ Amount too low:', amountInPaise);
      return res.status(400).json({
        success: false,
        message: 'Amount must be at least ₹1'
      });
    }

    // Create Razorpay order
    const order = await createOrder(amountInPaise, {
      name: donorInfo.name,
      email: donorInfo.email
    });

    console.log('✅ Razorpay order created:', {
      id: order.orderId,
      amount: amountInPaise,
      donorName: donorInfo.name
    });

    // Create donation record
    const donationData = {
      type: donationType?.toLowerCase() || 'general',
      amount: amount, // Store in rupees
      donorInfo: {
        ...donorInfo,
        email: donorInfo.email.toLowerCase().trim(),
        name: donorInfo.name.trim()
      },
      payment_id: order.orderId,
      status: 'PENDING',
      payment_details: {
        amount: amountInPaise, // Store in paise
        created_at: new Date().toISOString(),
        razorpay_order_id: order.orderId
      }
    };

    try {
      // Try to create donation in Supabase
      const donation = await donationService.createDonation(donationData);
      console.log('✅ Donation record created in Supabase:', donation);
      // Generate payment URL for Razorpay
      const paymentUrl = `https://api.razorpay.com/v1/checkout/embedded?key_id=${process.env.RAZORPAY_KEY_ID}&order_id=${order.orderId}&name=Gomantakgausevak&description=Donation&prefill[name]=${encodeURIComponent(donorInfo.name)}&prefill[email]=${encodeURIComponent(donorInfo.email)}&prefill[contact]=${encodeURIComponent(donorInfo.phone || '')}&notes[donationId]=${donation.id}&callback_url=${encodeURIComponent((process.env.FRONTEND_URL || 'https://donate.gomantakgausevak.com') + '/payment-status')}&cancel_url=${encodeURIComponent((process.env.FRONTEND_URL || 'https://donate.gomantakgausevak.com') + '/payment-cancelled')}`;      res.set('Content-Type', 'application/json');
      res.status(201).json({
        success: true,
        donation,
        order,
        donationId: donation.id,
        paymentUrl: paymentUrl
      });
    } catch (dbError) {
      console.error('❌ Supabase insert failed:', dbError);
      // If Supabase fails, use local storage fallback
      const donation = donationService._createLocalDonation(donationData);
      console.log('⚠️ Local fallback donation record:', donation);
      // Generate payment URL for Razorpay
      const paymentUrl = `https://api.razorpay.com/v1/checkout/embedded?key_id=${process.env.RAZORPAY_KEY_ID}&order_id=${order.orderId}&name=Gomantakgausevak&description=Donation&prefill[name]=${encodeURIComponent(donorInfo.name)}&prefill[email]=${encodeURIComponent(donorInfo.email)}&prefill[contact]=${encodeURIComponent(donorInfo.phone || '')}&notes[donationId]=${donation.id}&callback_url=${encodeURIComponent((process.env.FRONTEND_URL || 'https://donate.gomantakgausevak.com') + '/payment-status')}&cancel_url=${encodeURIComponent((process.env.FRONTEND_URL || 'https://donate.gomantakgausevak.com') + '/payment-cancelled')}`;      res.set('Content-Type', 'application/json');
      res.status(201).json({
        success: true,
        donation,
        order,
        donationId: donation.id,
        paymentUrl: paymentUrl
      });
    }
  } catch (error) {
    console.error('💥 Error creating donation:', {
      message: error.message,
      stack: error.stack
    });

    res.status(500).json({
      success: false,
      message: error.message || 'Failed to create donation. Please try again.'
    });
  }
});

// Create SDK order for mobile app
router.post('/create-sdk-order', async (req, res) => {
  try {
    const { amount, donorInfo, donationType } = req.body;

    // Validate amount
    const amountInPaise = Math.round(parseFloat(amount) * 100);
    if (isNaN(amountInPaise) || amountInPaise < 100) {
      return res.status(400).json({
        success: false,
        message: 'Invalid amount. Minimum amount is ₹1'
      });
    }

    // Create SDK order
    const result = await createSdkOrder(amountInPaise);

    // Create donation record
    const donationData = {
      type: donationType?.toLowerCase() || 'general',
      amount: amountInPaise / 100,
      donorInfo,
      merchantOrderId: result.merchantOrderId,
      status: 'PENDING',
      createdAt: new Date().toISOString()
    };

    const donation = await donationService.createDonation(donationData);

    res.status(201).json({
      success: true,
      token: result.token,
      merchantOrderId: result.merchantOrderId,
      donationId: donation.id
    });
  } catch (error) {
    console.error('Error creating SDK order:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create SDK order',
      error: error.message
    });
  }
});

// Payment status endpoint (redirect URL)
router.get('/payment-status', async (req, res) => {
  try {
    const { merchantOrderId } = req.query;
    if (!merchantOrderId) {
      throw new Error('Merchant order ID is required');
    }

    console.log('Checking payment status for order:', merchantOrderId);

    // Get donation details first
    const donation = await donationService.getDonationByMerchantOrderId(merchantOrderId);
    if (!donation) {
      throw new Error(`Donation not found for order: ${merchantOrderId}`);
    }

    // Check payment status
    const status = await checkPaymentStatus(merchantOrderId);
    console.log('Payment status response:', {
      merchantOrderId,
      status: status.state,
      amount: status.amount,
      payment: status.payment,
      donorInfo: donation.donorInfo
    });

    if (!status.success) {
      throw new Error(status.message || 'Payment verification failed');
    }

    // Verify amount if available
    const expectedAmount = donation.payment_details?.amount;
    if (expectedAmount && status.amount && Math.abs(status.amount - expectedAmount) > 1) {
      console.error('Amount mismatch:', {
        expected: expectedAmount,
        received: status.amount,
        difference: Math.abs(status.amount - expectedAmount)
      });
      // Log but don't fail - amount verification is secondary
    }

    // Update donation status
    const paymentDetails = {
      ...(status.payment || {}),
      last_checked: new Date().toISOString(),
      amount: status.amount,
      status: status.state,
      status_message: status.statusMessage
    };

    await donationService.updateDonation(donation.id, {
      status: status.state,
      payment_details: paymentDetails,
      updatedAt: new Date().toISOString()
    });

    // Send thank you email if payment successful
    if (status.state === 'SUCCESS' && donation.donorInfo?.email) {
      try {
        await sendThankYouEmail({
          email: donation.donorInfo.email,
          name: donation.donorInfo.name,
          amount: status.amount / 100, // Convert paise to rupees
          donationId: donation.id
        });
      } catch (emailError) {
        console.error('Error sending thank you email:', emailError);
        // Don't throw error, continue with response
      }
    }

    // Determine payment status and message
    let paymentStatus = 'error';
    let message = status.statusMessage;

    switch (status.state) {
      case 'SUCCESS':
        paymentStatus = 'success';
        break;
      case 'FAILED':
        paymentStatus = 'failed';
        break;
      case 'PENDING':
        paymentStatus = 'pending';
        break;
      case 'CANCELLED':
        paymentStatus = 'cancelled';
        break;
      case 'REFUNDED':
        paymentStatus = 'refunded';
        break;
      default:
        paymentStatus = 'error';
    }

    // Redirect to frontend with status
    const redirectUrl = new URL(process.env.FRONTEND_URL + '/donation-status');
    redirectUrl.searchParams.set('status', paymentStatus);
    redirectUrl.searchParams.set('donationId', donation.id);
    redirectUrl.searchParams.set('message', message);
    redirectUrl.searchParams.set('amount', (status.amount / 100).toFixed(2));

    console.log('Redirecting to:', redirectUrl.toString());
    res.redirect(redirectUrl.toString());

  } catch (error) {
    console.error('Error checking payment status:', {
      message: error.message,
      stack: error.stack,
      merchantOrderId
    });

    const redirectUrl = new URL(process.env.FRONTEND_URL + '/donation-status');
    redirectUrl.searchParams.set('status', 'error');
    redirectUrl.searchParams.set('message', error.message || 'Payment verification failed. Please contact support.');
    res.redirect(redirectUrl.toString());
  }
});

// PhonePe callback endpoint
router.post('/callback', async (req, res) => {
  try {
    const authorization = req.headers.authorization;
    const callbackResponse = await validateCallback(authorization, req.body);
    console.log('Payment callback received:', callbackResponse);

    // Get donation details
    const donation = await donationService.getDonationByMerchantOrderId(callbackResponse.merchantOrderId);
    if (!donation) {
      throw new Error('Donation not found');
    }

    // Update donation status
    await donationService.updateDonation(donation.id, {
      status: callbackResponse.state,
      payment_details: callbackResponse.payment,
      updatedAt: new Date().toISOString()
    });

    // Send thank you email if payment successful
    if (callbackResponse.state === 'COMPLETED' && donation.donorInfo?.email) {
      await sendThankYouEmail(donation);
    }

    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Callback validation failed:', error);
    res.status(500).json({
      success: false,
      message: 'Callback validation failed'
    });
  }
});

// Check payment status by transaction ID
router.get('/payment-status/:transactionId', async (req, res) => {
  try {
    const { transactionId } = req.params;
    console.log('Checking payment status for transaction:', transactionId);

    // Try to find donation by transaction ID first
    let donation = await donationService.getDonationByTransactionId(transactionId);
    
    // If not found by transaction ID, try merchant order ID
    if (!donation && transactionId.startsWith('DON_')) {
      donation = await donationService.getDonationByMerchantOrderId(transactionId);
    }

    if (!donation) {
      console.error('Donation not found for transaction:', transactionId);
      return res.status(404).json({
        status: 'failed',
        message: 'Donation not found'
      });
    }

    console.log('Found donation:', donation);

    // Check payment status using merchant order ID
    const paymentStatus = await checkPaymentStatus(donation.merchantOrderId);
    console.log('Payment status response:', paymentStatus);

    // Update donation status if needed
    if (paymentStatus.success) {
      const updateData = {
        status: paymentStatus.state,
        payment_details: {
          ...donation.payment_details,
          last_checked: new Date().toISOString(),
          payment_mode: paymentStatus.mode,
          transaction_id: transactionId
        }
      };

      // If payment is successful, update payment ID
      if (paymentStatus.state === 'COMPLETED') {
        updateData.payment_id = transactionId;
      }

      console.log('Updating donation:', { id: donation.id, updateData });
      await donationService.updateDonation(donation.id, updateData);

      // Refresh donation data
      donation = await donationService.getDonationById(donation.id);
    }

    res.status(200).json({
      status: paymentStatus.success ? 'success' : 'failed',
      message: paymentStatus.message || 'Payment status checked successfully',
      donation: {
        ...donation,
        status: paymentStatus.state,
        payment_details: {
          ...donation.payment_details,
          transaction_id: transactionId
        }
      }
    });
  } catch (error) {
    console.error('Error checking payment status:', error);
    res.status(500).json({
      status: 'failed',
      message: error.message
    });
  }
});

// Check payment status by merchant order ID
router.get('/check-status/:merchantOrderId', async (req, res) => {
  try {
    const { merchantOrderId } = req.params;
    const { details } = req.query;

    // Check payment status
    const statusResult = await checkPaymentStatus(merchantOrderId, details === 'true');

    // Find donation by merchant order ID
    const donation = await donationService.getDonationByMerchantOrderId(merchantOrderId);
    if (!donation) {
      return res.status(404).json({
        message: 'Donation not found',
        paymentStatus: statusResult
      });
    }

    // Update donation status if payment is completed or failed
    if (statusResult.state !== donation.status) {
      await donationService.updateDonation(donation.id, {
        status: statusResult.state,
        payment_details: {
          ...donation.payment_details,
          last_checked: new Date().toISOString(),
          payment_mode: statusResult.paymentInfo?.mode,
          transaction_id: statusResult.paymentInfo?.transactionId,
          error_code: statusResult.paymentInfo?.errorCode,
          detailed_error: statusResult.paymentInfo?.detailedErrorCode
        }
      });
    }

    res.status(200).json({
      success: true,
      donation,
      paymentStatus: statusResult
    });
  } catch (error) {
    console.error('Error checking payment status:', error);
    res.status(500).json({
      message: 'Failed to check payment status',
      error: error.message
    });
  }
});

// Initiate refund for a donation (auth required)
router.post('/:id/refund', authenticateToken, async (req, res) => {
  try {
    const { amount, reason } = req.body;
    
    // Get donation
    const donation = await donationService.getDonationById(req.params.id);
    if (!donation) {
      return res.status(404).json({ message: 'Donation not found' });
    }

    // Check if user is authorized (admin or donor)
    if (donation.userId !== req.user.userId && !req.user.isAdmin) {
      return res.status(403).json({ message: 'Not authorized to refund this donation' });
    }

    // Validate donation status
    if (donation.status !== 'completed') {
      return res.status(400).json({
        message: 'Cannot refund donation',
        details: 'Only completed donations can be refunded'
      });
    }

    // Validate refund amount
    const refundAmount = Number(amount);
    if (isNaN(refundAmount) || refundAmount <= 0 || refundAmount > donation.amount) {
      return res.status(400).json({
        message: 'Invalid refund amount',
        details: 'Amount must be greater than 0 and less than or equal to the donation amount'
      });
    }

    // Initiate refund
    const refundResult = await initiateRefund(
      donation.merchantOrderId,
      refundAmount,
      reason
    );

    // Update donation with refund details
    await donationService.updateDonation(donation.id, {
      refund_details: {
        merchant_refund_id: refundResult.merchantRefundId,
        refund_id: refundResult.refundId,
        amount: refundAmount,
        reason,
        status: refundResult.state,
        initiated_at: new Date().toISOString(),
        initiated_by: req.user.userId
      }
    });

    // Send refund notification
    if (donation.donorInfo?.email) {
      await sendAdminNotificationEmail({
        type: 'refund_initiated',
        donation,
        refund: refundResult,
        initiatedBy: req.user
      });
    }

    res.status(200).json({
      success: true,
      message: 'Refund initiated successfully',
      refundId: refundResult.refundId,
      state: refundResult.state
    });
  } catch (error) {
    console.error('Error initiating refund:', error);
    const status = error.httpStatus || 500;
    res.status(status).json({
      success: false,
      message: 'Failed to initiate refund',
      error: {
        code: error.code || 'REFUND_ERROR',
        message: error.message,
        details: error.details
      }
    });
  }
});

// Check refund status
router.get('/:id/refund-status', async (req, res) => {
  try {
    const donation = await donationService.getDonationById(req.params.id);
    if (!donation) {
      return res.status(404).json({ message: 'Donation not found' });
    }

    if (!donation.refund_details?.merchant_refund_id) {
      return res.status(400).json({
        message: 'No refund found for this donation'
      });
    }

    const refundStatus = await checkRefundStatus(
      donation.refund_details.merchant_refund_id
    );

    // Update refund status in donation
    if (refundStatus.state !== donation.refund_details.status) {
      await donationService.updateDonation(donation.id, {
        refund_details: {
          ...donation.refund_details,
          status: refundStatus.state,
          last_checked: new Date().toISOString(),
          error_code: refundStatus.errorCode,
          detailed_error: refundStatus.detailedErrorCode
        }
      });
    }

    res.status(200).json({
      success: true,
      donation,
      refundStatus
    });
  } catch (error) {
    console.error('Error checking refund status:', error);
    res.status(500).json({
      message: 'Failed to check refund status',
      error: error.message
    });
  }
});

// Update donation status (auth required)
router.patch('/:id/status', authenticateToken, async (req, res) => {
  try {
    const { status, paymentId } = req.body;
    const donation = await donationService.getDonationById(req.params.id);
    
    if (!donation || donation.userId !== req.user.userId) {
      return res.status(404).json({ message: 'Donation not found' });
    }

    // Update donation status
    await donationService.updateDonation(donation.id, { status, paymentId });

    // Get updated donation
    const updatedDonation = await donationService.getDonationById(donation.id);
    
    // If status is pending, generate new payment URL
    if (status === 'pending') {
      const { paymentUrl, merchantTransactionId } = await generatePaymentRequest(updatedDonation);
      await donationService.updateDonation(donation.id, { paymentId: merchantTransactionId });

      return res.status(200).json({
        message: 'Payment URL generated successfully',
        donation: updatedDonation,
        paymentUrl
      });
    }

    res.status(200).json({
      message: 'Donation status updated successfully',
      donation: updatedDonation
    });
  } catch (error) {
    console.error('Error updating donation status:', error);
    res.status(500).json({ message: 'Error updating donation status' });
  }
});

// Create donation and payment order
router.post('/razorpay', async (req, res) => {
  try {
    const { amount, donorInfo, donationType } = req.body;
    
    // Validate request
    if (!amount || typeof amount !== 'number' || amount < 1) {
      return res.status(400).json({
        success: false,
        message: 'Invalid amount. Minimum donation is ₹1'
      });
    }

    // Create donation record
    const donation = await donationService.createDonation({
      amount,
      donorInfo,
      type: donationType || 'general',
      status: 'PENDING'
    });

    // Create Razorpay order
    const order = await createOrder(amount, donation.id, {
      donationType: donationType || 'general',
      donorEmail: donorInfo.email
    });
    
    res.status(201).json({
      success: true,
      order,
      donationId: donation.id
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to create donation'
    });
  }
});

// Verify payment
router.post('/verify', async (req, res) => {
  try {
    const { paymentId, orderId, donationId } = req.body;
    
    const verification = await verifyPayment(paymentId);
    
    if (verification.success) {
      const payment = verification.payment;
      
      // Update donation record
      await donationService.updateDonation(donationId, {
        status: 'COMPLETED',
        payment_details: {
          paymentId: payment.id,
          orderId: payment.order_id,
          method: payment.method,
          amount: payment.amount / 100, // Convert back to rupees
          status: payment.status,
          captured: payment.captured,
          timestamp: new Date(payment.created_at * 1000).toISOString()
        }
      });

      // Get updated donation
      const donation = await donationService.getDonationById(donationId);
      
      // Send thank you email
      if (donation.donorInfo?.email) {
        await sendThankYouEmail({
          to: donation.donorInfo.email,
          name: donation.donorInfo.name,
          amount: donation.amount,
          paymentId: payment.id
        });
      }
    }
    
    res.status(200).json(verification);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Payment verification failed'
    });
  }
});

// Razorpay webhook handler
router.post('/webhook', express.json(), async (req, res) => {
  const signature = req.headers['x-razorpay-signature'];
  
  if (!validateWebhookSignature(req.body, signature)) {
    return res.status(401).json({ success: false, message: 'Invalid signature' });
  }

  const event = req.body.event;
  const payment = req.body.payload.payment?.entity;
  
  try {
    if (event === 'payment.captured') {
      const donation = await donationService.getDonationByPaymentId(payment.id);
      
      if (!donation) {
        console.warn('No donation found for payment:', payment.id);
        return res.status(404).json({ success: false });
      }
      
      // Update donation status
      await donationService.updateDonation(donation.id, {
        status: 'COMPLETED',
        'payment_details.status': 'captured',
        'payment_details.captured': true
      });
    }
    
    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Webhook processing error:', error);
    res.status(500).json({ success: false });
  }
});

// Get donation by ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const donation = await donationService.getDonationById(req.params.id);
    
    if (!donation || donation.userId !== req.user.userId) {
      return res.status(404).json({ message: 'Donation not found' });
    }
    
    res.status(200).json(donation);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching donation' });
  }
});

module.exports = router;
