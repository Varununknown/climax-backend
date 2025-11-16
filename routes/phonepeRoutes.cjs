const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const axios = require('axios');
const Payment = require('../models/Payment.cjs');
const User = require('../models/User.cjs');
const Content = require('../models/Content.cjs');

// PhonePe Configuration from environment variables
const PHONEPE_CLIENT_ID = process.env.PHONEPE_CLIENT_ID || 'M23P3LGUEZTV0_2511161752';
const PHONEPE_CLIENT_SECRET = process.env.PHONEPE_CLIENT_SECRET || 'NDllODgwNzEtOGZiOC00NDhjLTkxMjMtNGIzZjM0NzM1YWY2';
const PHONEPE_ENVIRONMENT = process.env.PHONEPE_ENVIRONMENT || 'test'; // 'test' or 'production'

// PhonePe API URL
const PHONEPE_API = PHONEPE_ENVIRONMENT === 'production' 
  ? 'https://api.phonepe.com/apis/hermes'
  : 'https://api-sandbox.phonepe.com/apis/hermes';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:5000';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

console.log('🔐 PhonePe Configuration:');
console.log('  Client ID:', PHONEPE_CLIENT_ID ? '✅ Set' : '❌ Not set');
console.log('  Client Secret:', PHONEPE_CLIENT_SECRET ? '✅ Set' : '❌ Not set');
console.log('  Environment:', PHONEPE_ENVIRONMENT);
console.log('  API URL:', PHONEPE_API);
console.log('  Mode:', PHONEPE_ENVIRONMENT === 'production' ? '🔴 LIVE' : '🟢 TEST');

// Helper function to generate PhonePe checksum
const generateChecksum = (payload) => {
  const payloadStr = JSON.stringify(payload);
  const base64Payload = Buffer.from(payloadStr).toString('base64');
  const checksum = crypto
    .createHash('sha256')
    .update(base64Payload + '/pg/v1/pay' + PHONEPE_CLIENT_SECRET)
    .digest('hex');
  return {
    base64Payload,
    checksum
  };
};

// Helper function to verify PhonePe checksum
const verifyChecksum = (payload, receivedChecksum) => {
  const payloadStr = JSON.stringify(payload);
  const base64Payload = Buffer.from(payloadStr).toString('base64');
  const checksum = crypto
    .createHash('sha256')
    .update(base64Payload + '/pg/v1/pay' + PHONEPE_CLIENT_SECRET)
    .digest('hex');
  return checksum === receivedChecksum;
};

// Initialize PhonePe payment - Returns payment URL
router.post('/initiate', async (req, res) => {
  try {
    const { userId, contentId, amount, userEmail, userName } = req.body;

    console.log('\n═══════════════════════════════════════════════════════');
    console.log('💳 PhonePe Payment Initiation');
    console.log('User:', userId);
    console.log('Content:', contentId);
    console.log('Amount:', amount);
    console.log('═══════════════════════════════════════════════════════');

    // Validate PhonePe configuration
    if (!PHONEPE_CLIENT_ID || !PHONEPE_CLIENT_SECRET) {
      console.error('❌ PhonePe credentials not configured');
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
    const txnid = `CLIMAX_${contentId}_${userId}_${Date.now()}`;

    // Create payment record with pending status
    const newPayment = new Payment({
      userId: userIdObj,
      contentId: contentIdObj,
      amount: amount,
      transactionId: txnid,
      status: 'pending',
      paymentMethod: 'phonepe'
    });

    await newPayment.save();
    console.log('✅ Payment record created:', txnid);

    // Prepare PhonePe payload
    const payload = {
      merchantId: PHONEPE_CLIENT_ID,
      merchantTransactionId: txnid,
      merchantUserId: userId,
      amount: Math.round(amount * 100), // Convert to paise
      redirectUrl: `${FRONTEND_URL}/payment/phonepe/callback?txnid=${txnid}`,
      redirectMode: 'REDIRECT',
      callbackUrl: `${BACKEND_URL}/api/phonepe/callback`,
      mobileNumber: '9999999999', // Placeholder - can be updated
      paymentInstrument: {
        type: 'PAY_PAGE'
      }
    };

    console.log('📋 PhonePe Payload prepared:', { 
      txnid, 
      amount: `${amount}`, 
      redirectUrl: payload.redirectUrl 
    });

    // Generate checksum
    const { base64Payload, checksum } = generateChecksum(payload);

    // Make request to PhonePe API
    try {
      const phonepeResponse = await axios.post(
        `${PHONEPE_API}/pg/v1/pay`,
        { request: base64Payload },
        {
          headers: {
            'Content-Type': 'application/json',
            'X-VERIFY': checksum
          },
          timeout: 10000
        }
      );

      console.log('✅ PhonePe API Response:', phonepeResponse.data);

      if (phonepeResponse.data?.success) {
        const paymentUrl = phonepeResponse.data?.data?.instrumentResponse?.redirectUrl;
        
        if (paymentUrl) {
          console.log('✅ Payment URL generated:', paymentUrl);
          return res.status(200).json({
            success: true,
            message: 'Payment initiated',
            paymentUrl: paymentUrl,
            transactionId: txnid,
            redirectUrl: paymentUrl
          });
        } else {
          console.warn('⚠️ No redirect URL in PhonePe response');
          return res.status(200).json({
            success: true,
            message: 'Payment initiated',
            transactionId: txnid,
            redirectUrl: `${PHONEPE_API}/pg/v1/pay?request=${base64Payload}&X-VERIFY=${checksum}`
          });
        }
      } else {
        console.error('❌ PhonePe API Error:', phonepeResponse.data);
        return res.status(400).json({
          success: false,
          message: 'Failed to initiate payment',
          error: phonepeResponse.data?.message || 'Unknown error'
        });
      }
    } catch (axiosError) {
      console.error('❌ PhonePe API Request Error:', axiosError.response?.data || axiosError.message);
      
      // For test environment, return mock success with test redirect
      if (PHONEPE_ENVIRONMENT === 'test') {
        console.log('⚠️ Using test mode fallback response');
        return res.status(200).json({
          success: true,
          message: 'Payment initiated (test mode)',
          transactionId: txnid,
          redirectUrl: `${FRONTEND_URL}/payment/phonepe/test?txnid=${txnid}&status=INITIATED`,
          testMode: true
        });
      }

      return res.status(500).json({
        success: false,
        message: 'Failed to connect to payment gateway',
        error: axiosError.message
      });
    }
  } catch (err) {
    console.error('❌ PhonePe initiate error:', err.message);
    return res.status(500).json({
      success: false,
      message: 'Server error during payment initiation',
      error: err.message
    });
  }
});

// PhonePe callback handler
router.post('/callback', async (req, res) => {
  try {
    const { transactionId, code, data } = req.body;

    console.log('\n═══════════════════════════════════════════════════════');
    console.log('🔄 PhonePe Callback Received');
    console.log('Transaction ID:', transactionId);
    console.log('Code:', code);
    console.log('═══════════════════════════════════════════════════════');

    if (code === 'PAYMENT_SUCCESS' || code === 'PAYMENT_INITIATED') {
      // Update payment status
      const payment = await Payment.findOneAndUpdate(
        { transactionId: transactionId },
        { 
          status: 'approved',
          paymentMethod: 'phonepe',
          callbackData: data
        },
        { new: true }
      );

      if (payment) {
        console.log('✅ Payment approved:', transactionId);
        return res.status(200).json({
          success: true,
          message: 'Payment successful',
          transactionId: transactionId,
          status: 'approved'
        });
      } else {
        console.warn('⚠️ Payment record not found:', transactionId);
        return res.status(404).json({
          success: false,
          message: 'Payment record not found'
        });
      }
    } else {
      console.log('❌ Payment failed with code:', code);
      const payment = await Payment.findOneAndUpdate(
        { transactionId: transactionId },
        { 
          status: 'failed',
          callbackData: data
        },
        { new: true }
      );

      return res.status(400).json({
        success: false,
        message: 'Payment failed',
        code: code
      });
    }
  } catch (err) {
    console.error('❌ PhonePe callback error:', err.message);
    return res.status(500).json({
      success: false,
      message: 'Callback processing error',
      error: err.message
    });
  }
});

// Check payment status
router.get('/status/:transactionId', async (req, res) => {
  try {
    const { transactionId } = req.params;

    const payment = await Payment.findOne({ transactionId });
    
    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found'
      });
    }

    return res.status(200).json({
      success: true,
      transactionId: payment.transactionId,
      status: payment.status,
      amount: payment.amount,
      createdAt: payment.createdAt
    });
  } catch (err) {
    console.error('❌ Status check error:', err.message);
    return res.status(500).json({
      success: false,
      message: 'Error checking payment status',
      error: err.message
    });
  }
});

module.exports = router;
