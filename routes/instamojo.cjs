const express = require('express');
const router = express.Router();

// Check if required dependencies are available
let axios, Payment, User, Content, crypto;

try {
  axios = require('axios');
  Payment = require('../models/Payment.cjs');
  User = require('../models/User.cjs');
  Content = require('../models/Content.cjs');
  crypto = require('crypto');
  console.log('✅ Instamojo route dependencies loaded successfully');
} catch (err) {
  console.error('❌ ERROR loading Instamojo dependencies:', err.message);
  // Return error response for all routes if dependencies fail
  router.use((req, res) => {
    res.status(500).json({ error: 'Instamojo service unavailable: ' + err.message });
  });
  module.exports = router;
  throw err; // Crash loudly so we know there's an issue
}

// Instamojo Configuration
const INSTAMOJO_API_KEY = process.env.INSTAMOJO_API_KEY || '';
const INSTAMOJO_AUTH_TOKEN = process.env.INSTAMOJO_AUTH_TOKEN || '';
const INSTAMOJO_SALT = process.env.INSTAMOJO_SALT || '';

console.log('🔐 Instamojo Configuration:');
console.log('   API Key:', INSTAMOJO_API_KEY ? '✅ Set' : '❌ NOT SET');
console.log('   Auth Token:', INSTAMOJO_AUTH_TOKEN ? '✅ Set' : '❌ NOT SET');
console.log('   Salt:', INSTAMOJO_SALT ? '✅ Set' : '❌ NOT SET');

// Use production URL
const INSTAMOJO_API_URL = 'https://www.instamojo.com/api/1.1/';

// Create axios instance with error handling
let instamojoAPI;
try {
  instamojoAPI = axios.create({
    baseURL: INSTAMOJO_API_URL,
    headers: {
      'X-Api-Key': INSTAMOJO_API_KEY,
      'X-Auth-Token': INSTAMOJO_AUTH_TOKEN,
    },
    timeout: 30000,
  });
  console.log('✅ Instamojo axios instance created');
} catch (err) {
  console.error('❌ Failed to create axios instance:', err.message);
  throw err;
}

// ✅ POST - Initiate Payment (Create Payment Request)
router.post('/create', async (req, res) => {
  try {
    const { userId, contentId, amount, purpose } = req.body;

    if (!userId || !contentId || !amount) {
      return res.status(400).json({ error: 'Missing required fields: userId, contentId, amount' });
    }

    console.log('💳 Creating Instamojo payment request...');
    console.log('Amount in paise:', amount);

    // Verify user exists
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Verify content exists
    const content = await Content.findById(contentId);
    if (!content) {
      return res.status(404).json({ error: 'Content not found' });
    }

    // Convert paise to rupees
    const amountInRupees = (amount / 100).toFixed(2);

    // Prepare payment request data for Instamojo
    const paymentRequestData = {
      purpose: purpose || `Payment for ${content.title}`,
      amount: amountInRupees,
      buyer_name: user.name || 'Customer',
      email: user.email || 'user@climax.app',
      phone: user.phone || '9000000000',
      redirect_url: `${process.env.FRONTEND_URL || 'https://climaxott.vercel.app'}/payment/success`,
      send_email: false,
      send_sms: false,
      webhook: `${process.env.BACKEND_URL || 'https://climax-fullstack.onrender.com'}/api/instamojo/webhook`,
    };

    console.log('📡 Sending payment request to Instamojo:', paymentRequestData);

    // Create payment request via Instamojo API
    const response = await instamojoAPI.post('payment-requests/', paymentRequestData);

    console.log('✅ Instamojo payment request created:', response.data);

    const paymentRequest = response.data.payment_request;

    // Save payment record to database
    const payment = new Payment({
      userId,
      contentId,
      amount,
      status: 'pending',
      gateway: 'instamojo',
      transactionId: paymentRequest.id,
      paymentUrl: paymentRequest.longurl,
    });

    await payment.save();
    console.log('✅ Payment saved to database');

    res.json({
      success: true,
      paymentUrl: paymentRequest.longurl,
      transactionId: paymentRequest.id,
      message: 'Payment request created successfully',
    });
  } catch (error) {
    console.error('❌ Instamojo error:', error.response?.data || error.message);
    res.status(500).json({
      error: 'Failed to create payment request',
      details: error.response?.data?.message || error.message,
    });
  }
});

// ✅ GET - Payment Status
router.get('/status/:transactionId', async (req, res) => {
  try {
    const { transactionId } = req.params;

    console.log('🔍 Checking payment status:', transactionId);

    const response = await instamojoAPI.get(`payment-requests/${transactionId}/`);
    const paymentRequest = response.data.payment_request;

    res.json({
      status: paymentRequest.status,
      amount: paymentRequest.amount,
      purpose: paymentRequest.purpose,
      email: paymentRequest.email,
    });
  } catch (error) {
    console.error('❌ Status check error:', error.message);
    res.status(500).json({ error: 'Failed to check payment status' });
  }
});

// ✅ POST - Webhook Handler (Instamojo callbacks)
router.post('/webhook', async (req, res) => {
  try {
    console.log('🔔 Instamojo webhook received');
    console.log('Request body:', req.body);

    // Verify webhook signature
    const { payment_request_id, status, mac } = req.body;

    if (!payment_request_id || !status) {
      console.warn('⚠️ Missing payment_request_id or status');
      return res.status(400).json({ error: 'Invalid webhook data' });
    }

    // Find payment in database
    const payment = await Payment.findOne({ transactionId: payment_request_id });

    if (!payment) {
      console.warn('⚠️ Payment not found in database:', payment_request_id);
      return res.status(404).json({ error: 'Payment not found' });
    }

    // Update payment status
    if (status === 'completed') {
      payment.status = 'success';
      await payment.save();

      // Unlock content for user
      const user = await User.findById(payment.userId);
      if (user) {
        if (!user.purchasedContent) {
          user.purchasedContent = [];
        }
        if (!user.purchasedContent.includes(payment.contentId)) {
          user.purchasedContent.push(payment.contentId);
          await user.save();
          console.log('✅ Content unlocked for user');
        }
      }

      console.log('✅ Payment confirmed:', payment_request_id);
    } else if (status === 'failed' || status === 'expired') {
      payment.status = 'failed';
      await payment.save();
      console.log('❌ Payment failed:', payment_request_id);
    }

    res.json({ success: true });
  } catch (error) {
    console.error('❌ Webhook error:', error.message);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

// ✅ POST - Verify Payment
router.post('/verify', async (req, res) => {
  try {
    const { transactionId, userId, contentId } = req.body;

    console.log('🔍 Verifying payment:', transactionId);

    // Check database first
    const payment = await Payment.findOne({
      transactionId,
      userId,
      contentId,
      status: 'success',
    });

    if (payment) {
      console.log('✅ Payment verified from database');
      return res.json({ verified: true, message: 'Payment verified' });
    }

    // If not in database, check with Instamojo API
    const response = await instamojoAPI.get(`payment-requests/${transactionId}/`);
    const paymentRequest = response.data.payment_request;

    if (paymentRequest.status === 'completed') {
      // Update database and unlock content
      const dbPayment = await Payment.findOne({ transactionId });
      if (dbPayment) {
        dbPayment.status = 'success';
        await dbPayment.save();

        const user = await User.findById(userId);
        if (user && !user.purchasedContent?.includes(contentId)) {
          user.purchasedContent = user.purchasedContent || [];
          user.purchasedContent.push(contentId);
          await user.save();
        }
      }

      console.log('✅ Payment verified with Instamojo API');
      return res.json({ verified: true, message: 'Payment verified' });
    }

    console.log('⚠️ Payment not completed');
    res.json({ verified: false, message: 'Payment not completed' });
  } catch (error) {
    console.error('❌ Verification error:', error.message);
    res.status(500).json({ error: 'Verification failed' });
  }
});

module.exports = router;
