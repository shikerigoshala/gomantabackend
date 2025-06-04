const { initializePayment, checkPaymentStatus } = require('./services/payment');

/**
 * Test the PhonePe payment flow
 * @param {number} amount - Amount in rupees
 */
async function testPayment(amount = 100) {
  try {
    console.log('\n💰 Starting PhonePe payment test');
    console.log('----------------------------------------');

    // Convert amount to paise
    const amountInPaise = Math.round(amount * 100);

    const donorInfo = {
      name: 'Test User',
      email: 'test@example.com'
    };

    // Step 1: Initialize payment
    console.log('\n📦 Step 1: Initializing payment...');
    console.log('Amount:', { rupees: amount, paise: amountInPaise });

    const result = await initializePayment(amountInPaise, donorInfo);
    
    console.log('✅ Payment initialized successfully!');
    console.log('Payment details:', {
      merchantOrderId: result.merchantOrderId,
      amount: amountInPaise,
      checkoutUrl: result.checkoutUrl
    });

    // Step 2: Check initial payment status
    console.log('\n🔍 Step 2: Checking initial payment status...');
    let status = await checkPaymentStatus(result.merchantOrderId);
    
    console.log('Initial status:', {
      state: status.state,
      code: status.code,
      message: status.message
    });

    // Step 3: Wait and check again
    console.log('\n⏳ Step 3: Waiting 5 seconds...');
    await new Promise(resolve => setTimeout(resolve, 5000));

    console.log('🔍 Checking payment status again...');
    status = await checkPaymentStatus(result.merchantOrderId);
    
    console.log('Final status:', {
      state: status.state,
      code: status.code,
      message: status.message
    });

    console.log('\n✅ Test completed successfully!');
    console.log('----------------------------------------');

    // Return the test results
    return {
      success: true,
      merchantOrderId: result.merchantOrderId,
      checkoutUrl: result.checkoutUrl,
      finalStatus: status.state
    };
  } catch (error) {
    console.error('\n❌ Test failed:', {
      message: error.message,
      stack: error.stack
    });

    return {
      success: false,
      error: error.message
    };
  }
}

// Helper function to wait
function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Retry function with exponential backoff
async function retry(fn, maxRetries = 5, initialDelay = 5000) {
  let retries = 0;
  while (retries < maxRetries) {
    try {
      return await fn();
    } catch (error) {
      if ((error.isRateLimited || error.retryable) && retries < maxRetries - 1) {
        const delay = initialDelay * Math.pow(2, retries);
        console.log(`\n⏳ ${error.code || 'API error'}. Waiting ${delay/1000} seconds before retry (${retries + 1}/${maxRetries})...`);
        await wait(delay);
        retries++;
        continue;
      }
      throw error;
    }
  }
}

// Run the test with ₹100
retry(() => testPayment(100)).then(result => {
  if (result.success) {
    console.log('\n💳 To complete the test payment, visit:');
    console.log(result.checkoutUrl);
  } else {
    console.error('\n❌ Test failed:', result.error);
    process.exit(1);
  }
});
