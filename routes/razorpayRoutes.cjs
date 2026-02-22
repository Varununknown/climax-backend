/**
 * Razorpay Payment Routes
 * Handles order creation and payment verification
 */

const express = require('express');
const router = express.Router();
const Razorpay = require('razorpay');
const crypto = require('crypto');
const Payment = require('../models/Payment.cjs');
const User = require('../models/User.cjs');

const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID || 'rzp_live_SJFNtWf14PitN5';
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET || 'vFIttis17pondhRDlh5X8yWH';

const razorpay = new Razorpay({
  key_id: RAZORPAY_KEY_ID,
  key_secret: RAZORPAY_KEY_SECRET
});

/**
 * POST /api/razorpay/create-order
 * Create a Razorpay order
 */
router.post('/create-order', async (req, res) => {
  try {
    const { userId, contentId, amount, email, phone, userName } = req.body;

    if (!userId || !contentId || !amount) {
      return res.status(400).json({ 
        success: false, 
        error: 'Missing required fields' 
      });
    }

    // Create Razorpay order
    const options = {
      amount: Math.round(amount * 100), // Convert to paise
      currency: 'INR',
      receipt: `order_${contentId}_${userId}_${Date.now()}`,
      payment_capture: 1,
      notes: {
        userId,
        contentId,
        userName,
        email,
        phone
      }
    };

    const order = await razorpay.orders.create(options);

    res.json({
      success: true,
      order: {
        id: order.id,
        amount: order.amount,
        currency: order.currency,
        receipt: order.receipt,
        status: order.status,
        created_at: order.created_at
      }
    });
  } catch (error) {
    console.error('❌ Error creating Razorpay order:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message || 'Failed to create order' 
    });
  }
});

/**
 * POST /api/razorpay/verify-payment
 * Verify Razorpay payment and grant access
 */
router.post('/verify-payment', async (req, res) => {
  try {
    const { orderId, paymentId, signature, userId, contentId, amount } = req.body;

    if (!orderId || !paymentId || !signature || !userId || !contentId) {
      return res.status(400).json({ 
        success: false, 
        error: 'Missing required fields' 
      });
    }

    // Verify payment signature
    const hmac = crypto.createHmac('sha256', RAZORPAY_KEY_SECRET);
    hmac.update(orderId + '|' + paymentId);
    const generatedSignature = hmac.digest('hex');

    if (generatedSignature !== signature) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid payment signature' 
      });
    }

    // Check if payment already exists
    let existingPayment = await Payment.findOne({
      userId,
      contentId,
      paymentGateway: 'razorpay',
      status: 'success'
    });

    if (existingPayment) {
      return res.status(409).json({ 
        success: true,
        message: 'Payment already recorded',
        alreadyPaid: true
      });
    }

    // Create payment record
    const payment = new Payment({
      userId,
      contentId,
      amount,
      transactionId: paymentId,
      paymentGateway: 'razorpay',
      paymentMethod: 'razorpay',
      status: 'success',
      orderId,
      signature,
      timestamp: new Date()
    });

    await payment.save();

    // Grant user access to content
    await User.findByIdAndUpdate(
      userId,
      { $addToSet: { accessibleContent: contentId } },
      { new: true }
    );

    res.json({
      success: true,
      message: 'Payment verified and access granted',
      paid: true
    });
  } catch (error) {
    console.error('❌ Error verifying payment:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message || 'Payment verification failed' 
    });
  }
});

/**
 * GET /api/razorpay/payment-status/:paymentId
 * Check payment status
 */
router.get('/payment-status/:paymentId', async (req, res) => {
  try {
    const { paymentId } = req.params;

    const payment = await razorpay.payments.fetch(paymentId);

    res.json({
      success: true,
      payment: {
        id: payment.id,
        status: payment.status,
        amount: payment.amount,
        currency: payment.currency,
        method: payment.method
      }
    });
  } catch (error) {
    console.error('❌ Error fetching payment status:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message || 'Failed to fetch payment status' 
    });
  }
});

module.exports = router;
