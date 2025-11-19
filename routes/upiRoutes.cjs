const express = require('express');
const router = express.Router();
const Payment = require('../models/Payment.cjs');
const User = require('../models/User.cjs');

console.log('✅ UPI Deep Link routes loaded');

// 🔗 POST - Create Pending UPI Payment
router.post('/create-upi-pending', async (req, res) => {
  try {
    const { userId, contentId, amount, tempTransactionId } = req.body;

    if (!userId || !contentId || !amount) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    console.log('📝 Creating pending UPI payment:', tempTransactionId);

    // Create pending payment record
    const payment = new Payment({
      userId,
      contentId,
      amount,
      status: 'pending',
      gateway: 'upi',
      transactionId: tempTransactionId,
      createdAt: new Date()
    });

    await payment.save();
    console.log('✅ Pending UPI payment created:', tempTransactionId);

    res.json({
      success: true,
      transactionId: tempTransactionId,
      message: 'Payment record created. Please complete payment in UPI app.'
    });
  } catch (error) {
    console.error('❌ Error creating pending UPI payment:', error.message);
    res.status(500).json({
      error: 'Failed to create payment record',
      details: error.message
    });
  }
});

// ✅ POST - Verify UPI Transaction
router.post('/verify-upi', async (req, res) => {
  try {
    const { userId, contentId, transactionId } = req.body;

    if (!userId || !contentId || !transactionId) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    console.log('🔍 Verifying UPI transaction:', transactionId);

    // Validate transaction ID format (12+ alphanumeric characters)
    const txnIdPattern = /^[A-Z0-9]{12,}$/i;
    if (!txnIdPattern.test(transactionId)) {
      console.log('❌ Invalid transaction ID format:', transactionId);
      return res.status(400).json({
        success: false,
        error: 'INVALID_FORMAT',
        message: 'Transaction ID must be 12+ alphanumeric characters'
      });
    }

    // Check if this transaction already exists in database
    const existingPayment = await Payment.findOne({
      transactionId: transactionId,
      status: 'success'
    });

    if (existingPayment) {
      console.log('⚠️ Duplicate payment attempt:', transactionId);
      return res.status(400).json({
        success: false,
        error: 'DUPLICATE',
        message: 'This payment already exists in our system'
      });
    }

    // Find pending payment for this user/content
    const pendingPayment = await Payment.findOne({
      userId,
      contentId,
      status: 'pending',
      gateway: 'upi',
      createdAt: { $gte: new Date(Date.now() - 30 * 60 * 1000) } // Within last 30 minutes
    });

    if (!pendingPayment) {
      console.log('❌ No pending payment found for user:', userId, 'content:', contentId);
      return res.status(404).json({
        success: false,
        error: 'NOT_FOUND',
        message: 'No pending UPI payment found. Please try again.'
      });
    }

    // Update the transaction ID if different from temp one
    if (pendingPayment.transactionId !== transactionId) {
      pendingPayment.transactionId = transactionId;
    }

    // Mark payment as successful
    pendingPayment.status = 'success';
    pendingPayment.verifiedAt = new Date();
    await pendingPayment.save();

    console.log('✅ UPI transaction verified:', transactionId);

    // Unlock content for user
    const user = await User.findById(userId);
    if (user) {
      if (!user.purchasedContent) {
        user.purchasedContent = [];
      }
      if (!user.purchasedContent.includes(contentId)) {
        user.purchasedContent.push(contentId);
        await user.save();
        console.log('✅ Content unlocked for user:', userId);
      }
    }

    res.json({
      success: true,
      message: 'Payment verified! Content unlocked.',
      transactionId: transactionId,
      contentId: contentId
    });
  } catch (error) {
    console.error('❌ Verification error:', error.message);
    res.status(500).json({
      error: 'Failed to verify payment',
      details: error.message
    });
  }
});

// 🔗 GET - Check UPI Payment Status
router.get('/status/:transactionId', async (req, res) => {
  try {
    const { transactionId } = req.params;

    console.log('🔍 Checking UPI payment status:', transactionId);

    const payment = await Payment.findOne({
      transactionId,
      gateway: 'upi'
    });

    if (!payment) {
      return res.status(404).json({
        status: 'not_found',
        message: 'Payment not found'
      });
    }

    res.json({
      success: true,
      transactionId: payment.transactionId,
      status: payment.status,
      amount: payment.amount,
      createdAt: payment.createdAt,
      verifiedAt: payment.verifiedAt
    });
  } catch (error) {
    console.error('❌ Status check error:', error.message);
    res.status(500).json({
      error: 'Failed to check payment status',
      details: error.message
    });
  }
});

module.exports = router;
