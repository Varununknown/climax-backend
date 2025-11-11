const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const Payment = require('../models/Payment.cjs');
const User = require('../models/User.cjs');
const Content = require('../models/Content.cjs');

// PayU Configuration from environment variables
// Support both test and live credentials
const PAYU_MERCHANT_KEY = process.env.PAYU_MERCHANT_KEY || process.env.PAYU_TEST_MERCHANT_KEY || 'gtKFFx';
const PAYU_MERCHANT_SALT = process.env.PAYU_MERCHANT_SALT || process.env.PAYU_TEST_MERCHANT_SALT || 'eCwWELxi';
const PAYU_ENVIRONMENT = process.env.PAYU_ENVIRONMENT || 'test'; // 'test' or 'production'

// PayU gateway URL
const PAYU_GATEWAY = PAYU_ENVIRONMENT === 'production' 
  ? 'https://secure.payu.in/_payment'
  : 'https://sandboxsecure.payu.in/_payment';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:5000';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

console.log('🔐 PayU Configuration:');
console.log('  Merchant Key:', PAYU_MERCHANT_KEY ? '✅ Set' : '❌ Not set');
console.log('  Merchant Salt:', PAYU_MERCHANT_SALT ? '✅ Set' : '❌ Not set');
console.log('  Environment:', PAYU_ENVIRONMENT);
console.log('  Gateway URL:', PAYU_GATEWAY);
console.log('  Mode:', PAYU_ENVIRONMENT === 'production' ? '🔴 LIVE' : '🟢 TEST');

// Helper function to generate PayU hash
const generateHash = (data) => {
  const hashString = `${PAYU_MERCHANT_KEY}|${data.txnid}|${data.amount}|${data.productinfo}|${data.firstname}|${data.email}|||||||||||${PAYU_MERCHANT_SALT}`;
  return crypto.createHash('sha512').update(hashString).digest('hex');
};

// Helper function to verify PayU hash (for success callback)
const verifyHash = (hash, txnid, amount, productinfo, firstname, email) => {
  const hashString = `${PAYU_MERCHANT_KEY}|${txnid}|${amount}|${productinfo}|${firstname}|${email}|||||||||||${PAYU_MERCHANT_SALT}`;
  const expectedHash = crypto.createHash('sha512').update(hashString).digest('hex');
  return hash === expectedHash;
};

// Initialize PayU payment - Returns form HTML for redirect
router.post('/initiate', async (req, res) => {
  try {
    const { userId, contentId, amount, userEmail, userName } = req.body;

    console.log('\n═══════════════════════════════════════════════════════');
    console.log('🔐 PayU Payment Initiation');
    console.log('User:', userId);
    console.log('Content:', contentId);
    console.log('Amount:', amount);
    console.log('═══════════════════════════════════════════════════════');

    // Validate PayU configuration
    if (!PAYU_MERCHANT_KEY || !PAYU_MERCHANT_SALT) {
      console.error('❌ PayU credentials not configured');
      return res.status(500).json({
        success: false,
        message: 'Payment gateway not configured. Please try UPI payment instead.'
      });
    }

    // Validate request
    if (!userId || !contentId || !amount || !userEmail) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields'
      });
    }

    // Check if user already has approved payment for this content
    const mongoose = require('mongoose');
    const userIdObj = new mongoose.Types.ObjectId(userId);
    const contentIdObj = new mongoose.Types.ObjectId(contentId);

    const existingPayment = await Payment.findOne({
      userId: userIdObj,
      contentId: contentIdObj,
      status: 'approved'
    });

    if (existingPayment) {
      console.log('✅ User already has approved payment for this content');
      return res.status(200).json({
        success: false,
        message: 'You already have access to this content',
        alreadyPaid: true
      });
    }

    // Create unique transaction ID
    const txnid = `${contentId}-${userId}-${Date.now()}`;
    const productinfo = `Climax Premium - ${contentId}`;

    // Create payment record with pending status
    const newPayment = new Payment({
      userId: userIdObj,
      contentId: contentIdObj,
      amount: amount,
      transactionId: txnid,
      paymentMethod: 'payu',
      status: 'pending',
      payuTransactionId: null,
      createdAt: new Date()
    });

    await newPayment.save();
    console.log('✅ Payment record created:', txnid);

    // Generate PayU hash
    const payuHash = generateHash({
      txnid: txnid,
      amount: amount,
      productinfo: productinfo,
      firstname: userName,
      email: userEmail
    });

    console.log('✅ PayU hash generated');

    // Create PayU form HTML
    const formHtml = `
      <form id="payu_form" method="POST" action="${PAYU_GATEWAY}">
        <input type="hidden" name="key" value="${PAYU_MERCHANT_KEY}">
        <input type="hidden" name="txnid" value="${txnid}">
        <input type="hidden" name="amount" value="${amount}">
        <input type="hidden" name="productinfo" value="${productinfo}">
        <input type="hidden" name="firstname" value="${userName}">
        <input type="hidden" name="email" value="${userEmail}">
        <input type="hidden" name="phone" value="9999999999">
        <input type="hidden" name="surl" value="${BACKEND_URL}/api/payu/success">
        <input type="hidden" name="furl" value="${BACKEND_URL}/api/payu/failure">
        <input type="hidden" name="hash" value="${payuHash}">
        <input type="hidden" name="service_provider" value="payu_paisa">
        <button type="submit" style="display:none;">Submit</button>
      </form>
    `;

    res.json({
      success: true,
      formHtml: formHtml,
      txnid: txnid,
      message: 'PayU form ready for redirect'
    });

  } catch (err) {
    console.error('❌ PayU initiation error:', err);
    res.status(500).json({
      success: false,
      message: 'Payment gateway error. Please try again.',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
});

// PayU Success Callback - Called by PayU after successful payment
router.post('/success', async (req, res) => {
  try {
    console.log('\n═══════════════════════════════════════════════════════');
    console.log('✅ PayU Success Callback Received');
    console.log('═══════════════════════════════════════════════════════');
    console.log('Response:', req.body);

    const {
      txnid,
      amount,
      productinfo,
      firstname,
      email,
      status,
      hash,
      payuMoneyId,
      milesplit,
      mode,
      unmappedstatus
    } = req.body;

    // ✅ Verify hash to ensure request is from PayU
    const isHashValid = verifyHash(hash, txnid, amount, productinfo, firstname, email);
    console.log('Hash verification:', isHashValid ? '✅ Valid' : '❌ Invalid');

    if (!isHashValid) {
      console.error('❌ Hash mismatch - possible tampering detected');
      return res.redirect(`${FRONTEND_URL}/payment-failed?reason=invalid_hash`);
    }

    // Find payment record
    const payment = await Payment.findOne({ transactionId: txnid });

    if (!payment) {
      console.error('❌ Payment record not found:', txnid);
      return res.redirect(`${FRONTEND_URL}/payment-failed?reason=payment_not_found`);
    }

    // Update payment status based on PayU response
    if (status === 'success') {
      payment.status = 'approved';
      payment.payuTransactionId = payuMoneyId;
      payment.paymentMethod = 'payu';
      payment.updatedAt = new Date();
      
      await payment.save();
      console.log('✅✅✅ PAYMENT APPROVED');
      console.log('Payment record updated:', payment._id);
      
      // Redirect to success page with transaction ID
      return res.redirect(`${FRONTEND_URL}/payment-success?txn=${txnid}&amount=${amount}`);
    } else if (status === 'failure' || status === 'abandoned') {
      payment.status = 'declined';
      payment.updatedAt = new Date();
      await payment.save();
      
      console.log('❌ Payment failed/abandoned');
      return res.redirect(`${FRONTEND_URL}/payment-failed?reason=payment_failed&txn=${txnid}`);
    } else {
      console.log('⚠️ Unknown status:', status);
      return res.redirect(`${FRONTEND_URL}/payment-failed?reason=unknown_status&status=${status}`);
    }

  } catch (err) {
    console.error('❌ PayU success callback error:', err);
    return res.redirect(`${FRONTEND_URL}/payment-failed?reason=server_error`);
  }
});

// PayU Failure Callback
router.post('/failure', async (req, res) => {
  try {
    console.log('\n═══════════════════════════════════════════════════════');
    console.log('❌ PayU Failure Callback Received');
    console.log('═══════════════════════════════════════════════════════');
    console.log('Response:', req.body);

    const { txnid, status, unmappedstatus } = req.body;

    // Update payment status
    if (txnid) {
      const payment = await Payment.findOne({ transactionId: txnid });
      if (payment) {
        payment.status = 'declined';
        payment.updatedAt = new Date();
        await payment.save();
        console.log('Payment marked as declined');
      }
    }

    return res.redirect(`${FRONTEND_URL}/payment-failed?reason=payment_declined&txn=${txnid}&status=${unmappedstatus || status}`);

  } catch (err) {
    console.error('❌ PayU failure callback error:', err);
    return res.redirect(`${FRONTEND_URL}/payment-failed?reason=callback_error`);
  }
});

// Check PayU payment status
router.get('/check/:txnid', async (req, res) => {
  try {
    const { txnid } = req.params;

    const payment = await Payment.findOne({ transactionId: txnid });

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found'
      });
    }

    res.json({
      success: true,
      txnid: txnid,
      status: payment.status,
      amount: payment.amount,
      createdAt: payment.createdAt,
      updatedAt: payment.updatedAt,
      paymentMethod: payment.paymentMethod
    });

  } catch (err) {
    console.error('❌ PayU check error:', err);
    res.status(500).json({
      success: false,
      message: 'Error checking payment status'
    });
  }
});

module.exports = router;
