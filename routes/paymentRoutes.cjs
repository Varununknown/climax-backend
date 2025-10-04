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

    if (!userId || !contentId || !amount || !transactionId) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    // Check if user already has ANY payment for this content (prevent duplicates)
    const existing = await Payment.findOne({ userId, contentId });
    if (existing) {
      log('✅ Payment already exists - content status:', existing.status);
      
      if (existing.status === 'approved') {
        return res.status(200).json({ 
          message: 'Content already unlocked - payment approved',
          alreadyPaid: true,
          payment: existing
        });
      } else {
        return res.status(409).json({ 
          message: `Payment already exists with status: ${existing.status}`,
          alreadyExists: true,
          payment: existing
        });
      }
    }

    // ✅ AUTO-APPROVE: New payments are automatically approved
    const newPayment = new Payment({ 
      userId, 
      contentId, 
      amount, 
      transactionId,
      status: 'approved' // 🚀 AUTO-APPROVED for instant unlock
    });
    await newPayment.save();

    log('✅ New payment auto-approved:', transactionId);
    return res.status(201).json({ 
      message: 'Payment saved and auto-approved successfully',
      alreadyPaid: false 
    });
  } catch (err) {
    console.error('❌ Error saving payment:', err);
    return res.status(500).json({ message: 'Server error' });
  }
});

// Check if payment exists and is approved
router.get('/check', async (req, res) => {
  const { userId, contentId } = req.query;
  try {
    if (!userId || !contentId) {
      return res.status(400).json({ message: 'Missing query parameters' });
    }

    // Only check for approved payments for content unlock
    const payment = await Payment.findOne({ 
      userId, 
      contentId, 
      status: 'approved' 
    });
    
    return res.status(200).json({ paid: !!payment });
  } catch (err) {
    console.error('❌ Error checking payment:', err);
    return res.status(500).json({ message: 'Server error' });
  }
});

// Check if any payment exists (regardless of status) to prevent duplicates
router.get('/check-any', async (req, res) => {
  const { userId, contentId } = req.query;
  try {
    if (!userId || !contentId) {
      return res.status(400).json({ message: 'Missing query parameters' });
    }

    const payment = await Payment.findOne({ userId, contentId });
    
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
