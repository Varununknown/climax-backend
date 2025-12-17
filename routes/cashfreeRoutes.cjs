const express = require('express');
const router = express.Router();
const axios = require('axios');
const crypto = require('crypto');
const Payment = require('../models/Payment.cjs');
const User = require('../models/User.cjs');

// Cashfree Configuration
const CASHFREE_CONFIG = {
  APP_ID: process.env.CASHFREE_APP_ID || '',
  SECRET_KEY: process.env.CASHFREE_SECRET_KEY || '',
  CLIENT_ID: process.env.CASHFREE_CLIENT_ID || '',
  API_BASE: process.env.NODE_ENV === 'production' 
    ? 'https://api.cashfree.com/pg'
    : 'https://sandbox.cashfree.com/pg'
};

const log = (...args) => console.log('[💳 Cashfree]', ...args);

// ═══════════════════════════════════════════════════════════════
// 1️⃣ INITIATE PAYMENT - Create order and return payment token
// ═══════════════════════════════════════════════════════════════
router.post('/initiate', async (req, res) => {
  try {
    const { userId, contentId, amount, email, phone, userName } = req.body;

    if (!userId || !contentId || !amount || !email || !phone || !userName) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    log('📝 Initiating payment for:', { userId, contentId, amount });

    // Generate unique order ID
    const orderId = `CLX-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Prepare Cashfree payload
    const payload = {
      orderId: orderId,
      orderAmount: parseFloat(amount),
      orderCurrency: 'INR',
      customerDetails: {
        customerId: userId,
        customerEmail: email,
        customerPhone: phone,
        customerName: userName
      },
      orderMeta: {
        returnUrl: `${process.env.FRONTEND_URL || 'https://climax-fullstack.onrender.com'}/payment-status?orderId=${orderId}&contentId=${contentId}`,
        notifyUrl: `${process.env.BACKEND_URL || 'https://climax-fullstack.onrender.com/api'}/cashfree/webhook`,
        paymentMethods: 'cc,dc,netbanking,upi'
      },
      // Custom metadata for our app
      customMetadata: {
        contentId: contentId,
        userId: userId
      }
    };

    log('Sending to Cashfree:', payload);

    // Call Cashfree API to create order
    const response = await axios.post(
      `${CASHFREE_CONFIG.API_BASE}/orders`,
      payload,
      {
        headers: {
          'x-api-version': '2023-08-01',
          'x-client-id': CASHFREE_CONFIG.CLIENT_ID,
          'x-client-secret': CASHFREE_CONFIG.SECRET_KEY,
          'Content-Type': 'application/json'
        }
      }
    );

    log('✅ Order created:', response.data);

    // Save payment record in our DB
    const payment = new Payment({
      userId,
      contentId,
      amount,
      transactionId: orderId,
      method: 'cashfree',
      status: 'pending',
      metadata: {
        orderId: orderId,
        cashfreeOrderId: response.data.orderId,
        cashfreePaymentSessionId: response.data.paymentSessionId
      }
    });

    await payment.save();
    log('✅ Payment record saved');

    // Return payment token for frontend
    res.json({
      success: true,
      orderId: orderId,
      paymentSessionId: response.data.paymentSessionId,
      amount: amount,
      message: 'Payment initiated successfully'
    });

  } catch (error) {
    log('❌ Error initiating payment:', error.response?.data || error.message);
    res.status(500).json({ 
      message: 'Failed to initiate payment',
      error: error.response?.data || error.message 
    });
  }
});

// ═══════════════════════════════════════════════════════════════
// 2️⃣ VERIFY PAYMENT - Check payment status from Cashfree
// ═══════════════════════════════════════════════════════════════
router.post('/verify', async (req, res) => {
  try {
    const { orderId } = req.body;

    if (!orderId) {
      return res.status(400).json({ message: 'Order ID required' });
    }

    log('🔍 Verifying payment for order:', orderId);

    // Fetch payment status from Cashfree
    const response = await axios.get(
      `${CASHFREE_CONFIG.API_BASE}/orders/${orderId}`,
      {
        headers: {
          'x-api-version': '2023-08-01',
          'x-client-id': CASHFREE_CONFIG.CLIENT_ID,
          'x-client-secret': CASHFREE_CONFIG.SECRET_KEY
        }
      }
    );

    log('Cashfree response:', response.data);

    const orderStatus = response.data.orderStatus;
    const paymentStatus = response.data.paymentStatus;

    // Update our payment record
    const payment = await Payment.findOne({ transactionId: orderId });

    if (payment) {
      if (orderStatus === 'PAID' && paymentStatus === 'SUCCESS') {
        payment.status = 'approved';
        log('✅ Payment approved!');
      } else if (orderStatus === 'ACTIVE') {
        payment.status = 'pending';
        log('⏳ Payment pending');
      } else if (orderStatus === 'FAILED') {
        payment.status = 'failed';
        log('❌ Payment failed');
      }

      await payment.save();
    }

    res.json({
      success: true,
      status: payment?.status || 'unknown',
      orderStatus: orderStatus,
      paymentStatus: paymentStatus,
      payment: payment,
      message: `Payment status: ${paymentStatus}`
    });

  } catch (error) {
    log('❌ Error verifying payment:', error.response?.data || error.message);
    res.status(500).json({ 
      message: 'Failed to verify payment',
      error: error.response?.data || error.message 
    });
  }
});

// ═══════════════════════════════════════════════════════════════
// 3️⃣ WEBHOOK - Cashfree sends payment updates
// ═══════════════════════════════════════════════════════════════
router.post('/webhook', async (req, res) => {
  try {
    log('📨 Webhook received:', req.body);

    const { orderId, orderStatus, paymentStatus, cf_payment_id } = req.body;

    // Verify webhook signature
    const signature = req.headers['x-webhook-signature'];
    if (!verifyWebhookSignature(req.body, signature)) {
      log('❌ Invalid webhook signature');
      return res.status(401).json({ message: 'Unauthorized' });
    }

    // Update payment status
    const payment = await Payment.findOne({ transactionId: orderId });

    if (payment) {
      if (orderStatus === 'PAID' && paymentStatus === 'SUCCESS') {
        payment.status = 'approved';
        payment.metadata.cf_payment_id = cf_payment_id;
        log('✅ Payment confirmed via webhook');
      } else if (orderStatus === 'FAILED') {
        payment.status = 'failed';
        log('❌ Payment failed via webhook');
      }

      await payment.save();
    }

    res.json({ success: true, message: 'Webhook processed' });

  } catch (error) {
    log('❌ Webhook error:', error.message);
    res.status(500).json({ message: 'Webhook processing failed' });
  }
});

// ═══════════════════════════════════════════════════════════════
// 4️⃣ GET PAYMENT STATUS - Check if user paid for content
// ═══════════════════════════════════════════════════════════════
router.get('/status/:userId/:contentId', async (req, res) => {
  try {
    const { userId, contentId } = req.params;

    const payment = await Payment.findOne({
      userId,
      contentId,
      method: 'cashfree',
      status: 'approved'
    });

    res.json({
      paid: !!payment,
      payment: payment || null
    });

  } catch (error) {
    log('❌ Error checking payment status:', error.message);
    res.status(500).json({ message: 'Error checking payment status' });
  }
});

// ═══════════════════════════════════════════════════════════════
// HELPER: Verify Webhook Signature
// ═══════════════════════════════════════════════════════════════
function verifyWebhookSignature(payload, signature) {
  try {
    // Cashfree signature verification
    const message = JSON.stringify(payload);
    const hash = crypto
      .createHmac('sha256', CASHFREE_CONFIG.SECRET_KEY)
      .update(message)
      .digest('base64');

    return hash === signature;
  } catch (error) {
    log('❌ Signature verification error:', error.message);
    return false;
  }
}

module.exports = router;
