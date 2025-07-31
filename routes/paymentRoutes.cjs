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

    const existing = await Payment.findOne({ userId, contentId });
    if (existing) {
      return res.status(409).json({ message: 'Payment already exists' });
    }

    const newPayment = new Payment({ userId, contentId, amount, transactionId });
    await newPayment.save();

    log('✅ Payment saved:', transactionId);
    return res.status(201).json({ message: 'Payment saved successfully' });
  } catch (err) {
    console.error('❌ Error saving payment:', err);
    return res.status(500).json({ message: 'Server error' });
  }
});

// Check if payment exists
router.get('/check', async (req, res) => {
  const { userId, contentId } = req.query;
  try {
    if (!userId || !contentId) {
      return res.status(400).json({ message: 'Missing query parameters' });
    }

    const payment = await Payment.findOne({ userId, contentId });
    return res.status(200).json({ paid: !!payment });
  } catch (err) {
    console.error('❌ Error checking payment:', err);
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

module.exports = router;
