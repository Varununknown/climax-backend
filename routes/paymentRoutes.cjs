const express = require('express');
const router = express.Router();
const Payment = require('../models/Payment.cjs');
const User = require('../models/User.cjs');
const Content = require('../models/Content.cjs');

// 📝 Log helper
const log = (...args) => console.log('[💰 Payment]', ...args);

// Save a payment
router.post('/', async (req, res) => {
  try {
    const { userId, contentId, amount, transactionId } = req.body;

    console.log('═══════════════════════════════════════════════════════');
    console.log('💰 POST /payments - NEW PAYMENT SUBMISSION');
    console.log('Received:', { userId, contentId, amount, transactionId });

    if (!userId || !contentId || !amount || !transactionId) {
      console.log('❌ Missing required fields');
      return res.status(400).json({ message: 'Missing required fields' });
    }

    // ✅ CRITICAL: Convert string IDs to ObjectIds for MongoDB
    const userIdObj = new require('mongoose').Types.ObjectId(userId);
    const contentIdObj = new require('mongoose').Types.ObjectId(contentId);

    // Check if user already has ANY payment for this content (prevent duplicates)
    const existing = await Payment.findOne({ userId: userIdObj, contentId: contentIdObj });
    if (existing) {
      console.log('✅ Payment already exists:', existing.transactionId, 'Status:', existing.status);
      
      // If payment is already approved, treat as success
      if (existing.status === 'approved') {
        console.log('✅✅✅ PAYMENT IS ALREADY APPROVED - Returning 200 with paid: true');
        console.log('═══════════════════════════════════════════════════════');
        console.log('');
        return res.status(200).json({ 
          message: 'Content already unlocked! You have access to watch this content.',
          alreadyPaid: true,
          paid: true,  // ✅ CRITICAL: Add this for verification
          payment: existing
        });
      }
      
      // If payment exists but not approved yet, inform user
      console.log('⚠️ Payment exists but not approved yet (status:', existing.status + ')');
      console.log('═══════════════════════════════════════════════════════');
      console.log('');
      return res.status(200).json({ 
        message: 'Payment already submitted and is being processed.',
        alreadyPaid: false,
        paid: false,
        payment: existing
      });
    }

    // Check if there's a pending payment with same transaction ID (prevent duplicate submissions)
    const duplicateTransaction = await Payment.findOne({ transactionId });
    if (duplicateTransaction) {
      console.log('⚠️ Duplicate transaction ID attempted:', transactionId);
      
      if (duplicateTransaction.status === 'approved') {
        console.log('═══════════════════════════════════════════════════════');
        console.log('');
        return res.status(200).json({ 
          message: 'Payment already processed! Content is unlocked.',
          alreadyPaid: true,
          payment: duplicateTransaction
        });
      } else {
        console.log('═══════════════════════════════════════════════════════');
        console.log('');
        return res.status(400).json({ 
          message: 'This transaction ID has already been used. Please use a different transaction ID.'
        });
      }
    }

    // ✅ AUTO-APPROVE: All new payments are automatically approved for instant unlock
    const newPayment = new Payment({ 
      userId: userIdObj,     // ✅ Use converted ObjectId
      contentId: contentIdObj, // ✅ Use converted ObjectId
      amount, 
      transactionId,
      status: 'approved' // 🚀 INSTANT AUTO-APPROVAL
    });
    
    console.log('💾 Payment object created, status explicitly set to: approved');
    
    await newPayment.save();

    console.log('✅✅✅ PAYMENT AUTO-APPROVED AND SAVED');
    console.log('Saved payment:', {
      _id: newPayment._id,
      userId: newPayment.userId,
      contentId: newPayment.contentId,
      transactionId: newPayment.transactionId,
      status: newPayment.status,
      createdAt: newPayment.createdAt
    });
    console.log('📊 VERIFICATION: Confirming status is', newPayment.status, '(should be "approved")');
    console.log('═══════════════════════════════════════════════════════');
    console.log('');
    
    return res.status(201).json({ 
      message: 'Payment approved successfully! Content unlocked instantly.',
      alreadyPaid: false,
      paid: true,  // ✅ CRITICAL: Add this for verification
      payment: newPayment
    });
  } catch (err) {
    console.error('❌ Error saving payment:', err);
    console.log('═══════════════════════════════════════════════════════');
    console.log('');
    return res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Check if payment exists and is approved
router.get('/check', async (req, res) => {
  const { userId, contentId } = req.query;
  try {
    console.log('═══════════════════════════════════════════════════════');
    console.log('🔍 /payments/check CALLED');
    console.log('Query params received:', { userId, contentId });
    console.log('  userId type:', typeof userId, 'value:', userId);
    console.log('  contentId type:', typeof contentId, 'value:', contentId);
    
    if (!userId || !contentId) {
      console.log('❌ Missing parameters! Returning error');
      console.log('═══════════════════════════════════════════════════════\n');
      return res.status(400).json({ message: 'Missing query parameters' });
    }

    console.log(`📡 Building query...`);
    console.log(`   Finding: { userId: "${userId}", contentId: "${contentId}", status: "approved" }`);

    // ✅ CRITICAL FIX: Convert string IDs to MongoDB ObjectIds
    const query = {
      userId: new require('mongoose').Types.ObjectId(userId),
      contentId: new require('mongoose').Types.ObjectId(contentId),
      status: 'approved'
    };
    
    console.log('✅ Query after ObjectId conversion:', query);

    // Only check for approved payments for content unlock
    const payment = await Payment.findOne(query);
    
    console.log('📍 Query executed');
    
    if (payment) {
      console.log('✅✅✅ PAYMENT FOUND!');
      console.log('Payment details:', {
        _id: payment._id,
        userId: payment.userId,
        contentId: payment.contentId,
        transactionId: payment.transactionId,
        status: payment.status,
        createdAt: payment.createdAt
      });
      console.log('Returning: { paid: true }');
      console.log('═══════════════════════════════════════════════════════\n');
      return res.status(200).json({ paid: true, payment: payment });
    } else {
      console.log('❌ PAYMENT NOT FOUND with status "approved"');
      
      // Debug: Check if ANY payment exists for this user-content combo (with ObjectId conversion)
      const userIdObj = new require('mongoose').Types.ObjectId(userId);
      const contentIdObj = new require('mongoose').Types.ObjectId(contentId);
      
      const anyPayment = await Payment.findOne({ 
        userId: userIdObj,
        contentId: contentIdObj
      });
      if (anyPayment) {
        console.log('⚠️⚠️⚠️ PAYMENT EXISTS BUT STATUS IS WRONG!');
        console.log('Found payment:', {
          status: anyPayment.status,
          transactionId: anyPayment.transactionId,
          userId: anyPayment.userId,
          contentId: anyPayment.contentId
        });
      } else {
        console.log('⚠️ NO PAYMENT exists for this user-content combo at all');
        
        // Check if there are ANY payments in the database
        const totalPayments = await Payment.countDocuments();
        console.log(`ℹ️ Total payments in database: ${totalPayments}`);
      }
      
      console.log('Returning: { paid: false }');
      console.log('═══════════════════════════════════════════════════════\n');
      return res.status(200).json({ paid: false });
    }
  } catch (err) {
    console.error('❌ Error checking payment:', err);
    console.log('═══════════════════════════════════════════════════════\n');
    return res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Check if any payment exists (regardless of status) to prevent duplicates
router.get('/check-any', async (req, res) => {
  const { userId, contentId } = req.query;
  try {
    if (!userId || !contentId) {
      return res.status(400).json({ message: 'Missing query parameters' });
    }

    // ✅ CRITICAL: Convert string IDs to ObjectIds
    const userIdObj = new require('mongoose').Types.ObjectId(userId);
    const contentIdObj = new require('mongoose').Types.ObjectId(contentId);

    const payment = await Payment.findOne({ userId: userIdObj, contentId: contentIdObj });
    
    if (payment) {
      return res.status(200).json({ 
        exists: true, 
        status: payment.status,
        payment: payment 
      });
    } else {
      return res.status(200).json({ exists: false });
    }
  } catch (err) {
    console.error('❌ Error checking any payment:', err);
    return res.status(500).json({ message: 'Server error' });
  }
});

// ✅ Fetch all payments with user + content info
router.get('/all', async (req, res) => {
  try {
    const payments = await Payment.find().sort({ createdAt: -1 });

    const enriched = await Promise.all(
      payments.map(async (p) => {
        const user = await User.findById(p.userId).select('name email');
        const content = await Content.findById(p.contentId).select('title');
        return {
          _id: p._id,
          userId: p.userId,
          contentId: p.contentId,
          amount: p.amount,
          transactionId: p.transactionId,
          status: p.status,
          createdAt: p.createdAt,
          userName: user?.name || 'Unknown',
          userEmail: user?.email || 'Unknown',
          contentTitle: content?.title || 'Untitled'
        };
      })
    );

    return res.json(enriched);
  } catch (err) {
    console.error('❌ Error fetching payments:', err);
    return res.status(500).json({ message: 'Server error' });
  }
});

// ✅ Delete payment (admin rejection)
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const deleted = await Payment.findByIdAndDelete(id);
    if (!deleted) {
      return res.status(404).json({ message: 'Payment not found' });
    }

    log('🗑️ Deleted payment:', deleted.transactionId);
    return res.status(200).json({ message: 'Payment deleted successfully' });
  } catch (err) {
    console.error('❌ Error deleting payment:', err);
    return res.status(500).json({ message: 'Server error' });
  }
});

// ✅ Approve payment (admin approval) - POST version for CORS compatibility
router.post('/:id/approve', async (req, res) => {
  const { id } = req.params;
  try {
    const payment = await Payment.findByIdAndUpdate(
      id, 
      { status: 'approved' }, 
      { new: true }
    );
    
    if (!payment) {
      return res.status(404).json({ message: 'Payment not found' });
    }

    log('✅ Payment approved (POST):', payment.transactionId);
    return res.status(200).json({ 
      message: 'Payment approved successfully',
      payment 
    });
  } catch (err) {
    console.error('❌ Error approving payment:', err);
    return res.status(500).json({ message: 'Server error' });
  }
});

// ✅ Approve payment (admin approval)
router.patch('/:id/approve', async (req, res) => {
  const { id } = req.params;
  try {
    const payment = await Payment.findByIdAndUpdate(
      id, 
      { status: 'approved' }, 
      { new: true }
    );
    
    if (!payment) {
      return res.status(404).json({ message: 'Payment not found' });
    }

    log('✅ Payment approved:', payment.transactionId);
    return res.status(200).json({ 
      message: 'Payment approved successfully',
      payment 
    });
  } catch (err) {
    console.error('❌ Error approving payment:', err);
    return res.status(500).json({ message: 'Server error' });
  }
});

// ✅ Decline payment (admin decline) - POST version for CORS compatibility
router.post('/:id/decline', async (req, res) => {
  const { id } = req.params;
  try {
    const payment = await Payment.findByIdAndUpdate(
      id, 
      { status: 'declined' }, 
      { new: true }
    );
    
    if (!payment) {
      return res.status(404).json({ message: 'Payment not found' });
    }

    log('❌ Payment declined (POST):', payment.transactionId);
    return res.status(200).json({ 
      message: 'Payment declined successfully',
      payment 
    });
  } catch (err) {
    console.error('❌ Error declining payment:', err);
    return res.status(500).json({ message: 'Server error' });
  }
});

// ✅ Decline payment (admin decline)
router.patch('/:id/decline', async (req, res) => {
  const { id } = req.params;
  try {
    const payment = await Payment.findByIdAndUpdate(
      id, 
      { status: 'declined' }, 
      { new: true }
    );
    
    if (!payment) {
      return res.status(404).json({ message: 'Payment not found' });
    }

    log('❌ Payment declined:', payment.transactionId);
    return res.status(200).json({ 
      message: 'Payment declined successfully',
      payment 
    });
  } catch (err) {
    console.error('❌ Error declining payment:', err);
    return res.status(500).json({ message: 'Server error' });
  }
});

// ✅ Update payment status (temporary workaround for admin actions)
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { action } = req.query;
  
  try {
    let status;
    if (action === 'approve') {
      status = 'approved';
    } else if (action === 'decline') {
      status = 'declined';
    } else {
      return res.status(400).json({ message: 'Invalid action. Use approve or decline' });
    }

    const payment = await Payment.findByIdAndUpdate(
      id, 
      { status }, 
      { new: true }
    );
    
    if (!payment) {
      return res.status(404).json({ message: 'Payment not found' });
    }

    log(`✅ Payment ${action}d (PUT):`, payment.transactionId);
    return res.status(200).json({ 
      message: `Payment ${action}d successfully`,
      payment 
    });
  } catch (err) {
    console.error(`❌ Error ${action}ing payment:`, err);
    return res.status(500).json({ message: 'Server error' });
  }
});

// Health check for admin routes deployment
router.get('/admin-check', (req, res) => {
  res.json({ 
    message: 'Admin payment routes active',
    timestamp: new Date().toISOString(),
    postRoutesAvailable: true
  });
});

module.exports = router;
