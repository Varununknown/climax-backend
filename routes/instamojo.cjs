const express = require('express');
const router = express.Router();
const axios = require('axios');
const Payment = require('../models/Payment.cjs');
const User = require('../models/User.cjs');
const Content = require('../models/Content.cjs');

// Instamojo Configuration
const INSTAMOJO_API_KEY = process.env.INSTAMOJO_API_KEY || 'test_key';
const INSTAMOJO_AUTH_TOKEN = process.env.INSTAMOJO_AUTH_TOKEN || 'test_token';
const INSTAMOJO_API_URL = process.env.INSTAMOJO_ENV === 'production' 
  ? 'https://www.instamojo.com/api/1.1/'
  : 'https://test.instamojo.com/api/1.1/';

const instamojo = axios.create({
  baseURL: INSTAMOJO_API_URL,
  headers: {
    'X-API-KEY': INSTAMOJO_API_KEY,
    'X-AUTH-TOKEN': INSTAMOJO_AUTH_TOKEN,
  },
});

// ✅ POST - Initiate Payment
router.post('/create', async (req, res) => {
  try {
    const { userId, contentId, amount, purpose } = req.body;

    if (!userId || !contentId || !amount) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

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

    console.log('💳 Creating Instamojo payment request...');

    // Create request data for Instamojo
    const paymentData = {
      purpose: purpose || `Payment for ${content.title}`,
      amount: (amount / 100).toString(), // Convert paise to rupees
      buyer_name: user.name || 'Customer',
      email: user.email,
      phone: user.phone || '9000000000', // Default phone if not provided
      redirect_url: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/payment/success?orderId={id}`,
      webhook: `${process.env.BACKEND_URL || 'http://localhost:5000'}/api/instamojo/webhook`,
      allow_repeated_payments: false,
    };

    // Create payment request in Instamojo
    const response = await instamojo.post('payment-requests/', paymentData);

    console.log('✅ Payment request created:', response.data);

    // Save payment record to database
    const payment = new Payment({
      userId,
      contentId,
      amount,
      status: 'pending',
      gateway: 'instamojo',
      transactionId: response.data.payment_request.id,
      paymentUrl: response.data.payment_request.longurl,
    });

    await payment.save();

    res.json({
      success: true,
      paymentUrl: response.data.payment_request.longurl,
      transactionId: response.data.payment_request.id,
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

    const response = await instamojo.get(`payment-requests/${transactionId}/`);

    const paymentData = response.data.payment_request;
    const paymentStatus = paymentData.status === 'completed' ? 'success' : 'pending';

    res.json({
      status: paymentStatus,
      amount: paymentData.amount,
      purpose: paymentData.purpose,
      buyerEmail: paymentData.email,
    });
  } catch (error) {
    console.error('❌ Status check error:', error.message);
    res.status(500).json({ error: 'Failed to check payment status' });
  }
});

// ✅ POST - Webhook Handler (for Instamojo callbacks)
router.post('/webhook', async (req, res) => {
  try {
    const { payment_request_id, status } = req.body;

    console.log(`🔔 Webhook received: ${payment_request_id} - ${status}`);

    // Find payment record
    const payment = await Payment.findOne({ transactionId: payment_request_id });

    if (!payment) {
      console.warn('⚠️ Payment not found in database');
      return res.status(404).json({ error: 'Payment not found' });
    }

    // Update payment status
    if (status === 'completed') {
      payment.status = 'success';
      await payment.save();

      // Add content to user's collection
      const user = await User.findById(payment.userId);
      if (user) {
        if (!user.purchasedContent) {
          user.purchasedContent = [];
        }
        if (!user.purchasedContent.includes(payment.contentId)) {
          user.purchasedContent.push(payment.contentId);
          await user.save();
        }
      }

      console.log('✅ Payment confirmed and content unlocked');
    } else {
      payment.status = 'failed';
      await payment.save();
      console.log('❌ Payment failed');
    }

    res.json({ success: true });
  } catch (error) {
    console.error('❌ Webhook error:', error.message);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

// ✅ POST - Verify Payment (for frontend)
router.post('/verify', async (req, res) => {
  try {
    const { transactionId, userId, contentId } = req.body;

    // Check in database first
    const payment = await Payment.findOne({
      transactionId,
      userId,
      contentId,
      status: 'success',
    });

    if (payment) {
      return res.json({ verified: true, message: 'Payment verified' });
    }

    // If not in database, check with Instamojo API
    const response = await instamojo.get(`payment-requests/${transactionId}/`);
    const paymentData = response.data.payment_request;

    if (paymentData.status === 'completed') {
      // Update database
      const payment = await Payment.findOne({ transactionId });
      if (payment) {
        payment.status = 'success';
        await payment.save();

        const user = await User.findById(userId);
        if (user && !user.purchasedContent?.includes(contentId)) {
          user.purchasedContent = user.purchasedContent || [];
          user.purchasedContent.push(contentId);
          await user.save();
        }
      }

      return res.json({ verified: true, message: 'Payment verified' });
    }

    res.json({ verified: false, message: 'Payment not completed' });
  } catch (error) {
    console.error('❌ Verification error:', error.message);
    res.status(500).json({ error: 'Verification failed' });
  }
});

module.exports = router;
