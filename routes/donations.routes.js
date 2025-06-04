const express = require('express');
const { 
  initiateRefund,
  createOrder,
  validateWebhookSignature
} = require('../services/payment');
const { donationService } = require('../services/supabase.service');
const { sendThankYouEmail, sendAdminNotificationEmail } = require('../services/email');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Create a new donation and initialize payment
router.post('/', async (req, res) => {
  try {
    const { amount, donorInfo, donationType } = req.body;
    console.log('💰 Creating donation:', { amount, donationType });

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

    // Create donation record
    const donationData = {
      amount,
      donorInfo: {
        ...donorInfo,
        ipAddress: req.ip
      },
      type: donationType || 'one-time',
      status: 'pending',
      paymentMethod: req.body.paymentMethod || 'razorpay',
      metadata: {
        userAgent: req.headers['user-agent'],
        referrer: req.headers.referer
      }
    };

    // Create donation in database
    const donation = await donationService.createDonation(donationData);
    console.log('✅ Donation created:', donation.id);

    // Initialize payment with Razorpay
    const paymentData = {
      amount: amountInPaise,
      currency: 'INR',
      receipt: `donation_${donation.id}`,
      payment_capture: 1,
      notes: {
        donationId: donation.id,
        type: donationType || 'one-time',
        donorName: donorInfo.name,
        donorEmail: donorInfo.email
      }
    };

    const payment = await createOrder(paymentData);
    console.log('💰 Payment order created:', payment.id);

    // Update donation with payment ID
    await donationService.updateDonation(donation.id, {
      paymentId: payment.id,
      paymentDetails: payment
    });

    // Return payment details to client
    res.json({
      success: true,
      data: {
        donationId: donation.id,
        payment,
        key: process.env.RAZORPAY_KEY_ID
      }
    });

  } catch (error) {
    console.error('❌ Error creating donation:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create donation',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Create an order for Razorpay SDK
router.post('/create-sdk-order', async (req, res) => {
  try {
    const { amount, donorInfo, donationType } = req.body;

    // Validate amount
    if (!amount || isNaN(amount) || amount < 1) {
      return res.status(400).json({
        success: false,
        message: 'Invalid amount. Minimum amount is ₹1.'
      });
    }

    // Create donation record first
    const donationData = {
      amount,
      donorInfo,
      type: donationType || 'one-time',
      status: 'pending',
      paymentMethod: 'razorpay',
      metadata: {
        userAgent: req.headers['user-agent'],
        referrer: req.headers.referer
      }
    };

    const donation = await donationService.createDonation(donationData);

    // Create Razorpay order
    const order = await createOrder({
      amount: Math.round(amount * 100), // Convert to paise
      currency: 'INR',
      receipt: `donation_${donation.id}`,
      payment_capture: 1,
      notes: {
        donationId: donation.id,
        type: donationType || 'one-time',
        donorName: donorInfo?.name,
        donorEmail: donorInfo?.email
      }
    });

    // Update donation with payment ID
    await donationService.updateDonation(donation.id, {
      paymentId: order.id,
      paymentDetails: order
    });

    res.json({
      success: true,
      data: {
        orderId: order.id,
        donationId: donation.id,
        amount: order.amount,
        currency: order.currency,
        key: process.env.RAZORPAY_KEY_ID
      }
    });

  } catch (error) {
    console.error('Error creating SDK order:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create payment order',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Verify payment and update donation status
router.post('/verify-payment', async (req, res) => {
  try {
    const { razorpay_payment_id, razorpay_order_id, razorpay_signature } = req.body;
    
    if (!razorpay_payment_id || !razorpay_order_id || !razorpay_signature) {
      return res.status(400).json({
        success: false,
        message: 'Missing required payment verification data'
      });
    }

    // Verify the payment signature
    const isValid = validateWebhookSignature(
      `${razorpay_order_id}|${razorpay_payment_id}`,
      razorpay_signature
    );

    if (!isValid) {
      return res.status(400).json({
        success: false,
        message: 'Invalid payment signature'
      });
    }

    // Get the donation by order ID
    const donations = await donationService.getDonationsByPaymentId(razorpay_order_id);
    if (!donations || donations.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Donation not found for this payment'
      });
    }

    const donation = donations[0];

    // Update donation status
    await donationService.updateDonation(donation.id, {
      status: 'completed',
      paymentDetails: {
        ...donation.paymentDetails,
        razorpay_payment_id,
        razorpay_order_id,
        razorpay_signature,
        verified: true,
        verifiedAt: new Date().toISOString()
      }
    });

    // Send thank you email
    try {
      await sendThankYouEmail({
        to: donation.donorInfo.email,
        name: donation.donorInfo.name,
        amount: donation.amount,
        transactionId: razorpay_payment_id,
        date: new Date().toLocaleDateString()
      });

      // Send admin notification
      await sendAdminNotificationEmail({
        donationId: donation.id,
        amount: donation.amount,
        donorName: donation.donorInfo.name,
        donorEmail: donation.donorInfo.email,
        paymentId: razorpay_payment_id
      });
    } catch (emailError) {
      console.error('Failed to send emails:', emailError);
      // Continue even if email fails
    }

    res.json({
      success: true,
      message: 'Payment verified successfully',
      data: {
        donationId: donation.id,
        status: 'completed',
        paymentId: razorpay_payment_id
      }
    });

  } catch (error) {
    console.error('Error verifying payment:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to verify payment',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Get donation by ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const donation = await donationService.getDonationById(req.params.id);
    
    if (!donation) {
      return res.status(404).json({
        success: false,
        message: 'Donation not found'
      });
    }

    // Check if user is authorized to view this donation
    if (donation.userId && donation.userId !== req.user.userId && !req.user.isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view this donation'
      });
    }

    res.json({
      success: true,
      data: donation
    });

  } catch (error) {
    console.error('Error getting donation:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get donation',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Get all donations (admin only)
router.get('/', authenticateToken, async (req, res) => {
  try {
    // Check if user is admin
    if (!req.user.isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view all donations'
      });
    }

    const { page = 1, limit = 20, status } = req.query;
    const offset = (page - 1) * limit;

    // Build query filters
    const filters = {};
    if (status) filters.status = status;

    const { data: donations, error } = await donationService.getDonations({
      filters,
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    if (error) throw error;

    // Get total count for pagination
    const { count, error: countError } = await donationService.getDonationsCount(filters);
    if (countError) throw countError;

    res.json({
      success: true,
      data: {
        donations,
        pagination: {
          total: count,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(count / limit)
        }
      }
    });

  } catch (error) {
    console.error('Error getting donations:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get donations',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Update donation status (admin only)
router.patch('/:id/status', authenticateToken, async (req, res) => {
  try {
    // Check if user is admin
    if (!req.user.isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update donation status'
      });
    }

    const { status, notes } = req.body;
    
    if (!status) {
      return res.status(400).json({
        success: false,
        message: 'Status is required'
      });
    }

    // Get donation
    const donation = await donationService.getDonationById(req.params.id);
    if (!donation) {
      return res.status(404).json({
        success: false,
        message: 'Donation not found'
      });
    }

    // Update status
    const updatedDonation = await donationService.updateDonation(donation.id, {
      status,
      notes: notes ? [...(donation.notes || []), { status, notes, updatedAt: new Date() }] : donation.notes,
      updatedAt: new Date().toISOString()
    });

    // TODO: Send status update email to donor

    res.json({
      success: true,
      data: updatedDonation
    });

  } catch (error) {
    console.error('Error updating donation status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update donation status',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Process refund
router.post('/:id/refund', authenticateToken, async (req, res) => {
  try {
    // Check if user is admin
    if (!req.user.isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to process refunds'
      });
    }

    const { amount, reason = 'Refund requested by admin' } = req.body;
    
    // Get donation
    const donation = await donationService.getDonationById(req.params.id);
    if (!donation) {
      return res.status(404).json({
        success: false,
        message: 'Donation not found'
      });
    }

    // Check if donation is eligible for refund
    if (donation.status !== 'completed' || !donation.paymentDetails?.razorpay_payment_id) {
      return res.status(400).json({
        success: false,
        message: 'This donation cannot be refunded'
      });
    }

    // Process refund with Razorpay
    const refundAmount = amount ? Math.round(amount * 100) : Math.round(donation.amount * 100);
    const refund = await initiateRefund({
      paymentId: donation.paymentDetails.razorpay_payment_id,
      amount: refundAmount,
      notes: {
        reason,
        initiatedBy: req.user.id,
        donationId: donation.id
      }
    });

    // Update donation with refund details
    const updatedDonation = await donationService.updateDonation(donation.id, {
      status: 'refunded',
      refundDetails: {
        ...refund,
        reason,
        initiatedBy: req.user.id,
        processedAt: new Date().toISOString()
      },
      updatedAt: new Date().toISOString()
    });

    // TODO: Send refund confirmation email to donor

    res.json({
      success: true,
      message: 'Refund processed successfully',
      data: {
        refundId: refund.id,
        amount: refund.amount / 100, // Convert back to rupees
        status: refund.status,
        donation: updatedDonation
      }
    });

  } catch (error) {
    console.error('Error processing refund:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process refund',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Webhook handler for Razorpay
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  try {
    const signature = req.headers['x-razorpay-signature'];
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;

    if (!signature) {
      console.error('❌ Webhook signature missing');
      return res.status(400).json({ success: false, message: 'Signature missing' });
    }

    // Verify webhook signature
    const isValid = validateWebhookSignature(
      req.rawBody.toString(),
      signature,
      webhookSecret
    );

    if (!isValid) {
      console.error('❌ Invalid webhook signature');
      return res.status(400).json({ success: false, message: 'Invalid signature' });
    }

    const event = req.body;
    console.log('🔔 Webhook received:', event.event);

    // Handle different webhook events
    switch (event.event) {
      case 'payment.captured':
        await handleSuccessfulPayment(event.payload.payment.entity);
        break;
      
      case 'payment.failed':
        await handleFailedPayment(event.payload.payment.entity);
        break;
      
      case 'refund.processed':
        await handleProcessedRefund(event.payload.refund.entity);
        break;
      
      default:
        console.log(`Unhandled event type: ${event.event}`);
    }

    res.json({ success: true, message: 'Webhook processed' });

  } catch (error) {
    console.error('❌ Webhook error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Webhook processing failed',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Helper function to handle successful payment
async function handleSuccessfulPayment(payment) {
  try {
    const { order_id: orderId, id: paymentId, amount, currency } = payment;
    
    // Find donation by order ID
    const donations = await donationService.getDonationsByPaymentId(orderId);
    if (!donations || donations.length === 0) {
      console.error('Donation not found for order:', orderId);
      return;
    }

    const donation = donations[0];
    
    // Update donation status
    await donationService.updateDonation(donation.id, {
      status: 'completed',
      paymentDetails: {
        ...donation.paymentDetails,
        razorpay_payment_id: paymentId,
        razorpay_order_id: orderId,
        amount: amount / 100, // Convert to rupees
        currency,
        captured: true,
        capturedAt: new Date().toISOString()
      },
      updatedAt: new Date().toISOString()
    });

    // Send thank you email
    await sendThankYouEmail({
      to: donation.donorInfo.email,
      name: donation.donorInfo.name,
      amount: amount / 100,
      transactionId: paymentId,
      date: new Date().toLocaleDateString()
    });

    // Send admin notification
    await sendAdminNotificationEmail({
      donationId: donation.id,
      amount: amount / 100,
      donorName: donation.donorInfo.name,
      donorEmail: donation.donorInfo.email,
      paymentId
    });

    console.log(`✅ Updated donation ${donation.id} for successful payment ${paymentId}`);

  } catch (error) {
    console.error('Error handling successful payment:', error);
    // TODO: Log error to monitoring system
  }
}

// Helper function to handle failed payment
async function handleFailedPayment(payment) {
  try {
    const { order_id: orderId, id: paymentId, error } = payment;
    
    // Find donation by order ID
    const donations = await donationService.getDonationsByPaymentId(orderId);
    if (!donations || donations.length === 0) {
      console.error('Donation not found for order:', orderId);
      return;
    }

    const donation = donations[0];
    
    // Update donation status
    await donationService.updateDonation(donation.id, {
      status: 'failed',
      paymentDetails: {
        ...donation.paymentDetails,
        error: error || {},
        failedAt: new Date().toISOString()
      },
      updatedAt: new Date().toISOString()
    });

    console.log(`❌ Updated donation ${donation.id} for failed payment ${paymentId}`);

  } catch (error) {
    console.error('Error handling failed payment:', error);
    // TODO: Log error to monitoring system
  }
}

// Helper function to handle processed refund
async function handleProcessedRefund(refund) {
  try {
    const { payment_id: paymentId, id: refundId, amount, status } = refund;
    
    // Find donation by payment ID
    const donations = await donationService.getDonationsByPaymentId(paymentId);
    if (!donations || donations.length === 0) {
      console.error('Donation not found for payment:', paymentId);
      return;
    }

    const donation = donations[0];
    
    // Update donation with refund details
    await donationService.updateDonation(donation.id, {
      status: 'refunded',
      refundDetails: {
        ...donation.refundDetails,
        refundId,
        amount: amount / 100, // Convert to rupees
        status,
        processedAt: new Date().toISOString()
      },
      updatedAt: new Date().toISOString()
    });

    // TODO: Send refund confirmation email to donor

    console.log(`🔄 Updated donation ${donation.id} with refund ${refundId}`);

  } catch (error) {
    console.error('Error handling processed refund:', error);
    // TODO: Log error to monitoring system
  }
}

module.exports = router;
