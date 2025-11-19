const express = require('express');
const router = express.Router();
const Payment = require('../models/Payment.cjs');
const User = require('../models/User.cjs');

console.log('✅ UPI Deep Link routes loaded');

// ✅ POST - Verify UPI Transaction (Simple - Just check if unique and unlock)
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

    // Check if this transaction already exists (must be unique)
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

    // Create successful payment record
    const payment = new Payment({
      userId,
      contentId,
      amount: 0, // Amount will be from content pricing
      status: 'success',
      gateway: 'upi',
      transactionId: transactionId,
      createdAt: new Date()
    });

    await payment.save();
    console.log('✅ Payment created:', transactionId);

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
      success: false,
      error: 'VERIFICATION_ERROR',
      message: 'Failed to verify payment',
      details: error.message
    });
  }
});

module.exports = router;

