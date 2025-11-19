const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');

// Schema for Payment Settings
const settingsSchema = new mongoose.Schema({
  upiId: { type: String, required: true },
  qrCodeUrl: { type: String, required: true },
  merchantName: { type: String, required: true },
  isActive: { type: Boolean, default: true },
  phonepeEnabled: { type: Boolean, default: true }, // ✅ Enable PhonePe tab
}, { timestamps: true });

const PaymentSettings = mongoose.model('PaymentSettings', settingsSchema);

// GET latest settings
router.get('/', async (req, res) => {
  try {
    const latest = await PaymentSettings.findOne().sort({ updatedAt: -1 });
    if (!latest) {
      return res.status(404).json({ message: 'No payment settings found' });
    }
    return res.json(latest);
  } catch (err) {
    console.error('❌ Error fetching payment settings:', err);
    return res.status(500).json({ message: 'Server error' });
  }
});

// POST to save or update latest settings
router.post('/', async (req, res) => {
  try {
    const { upiId, qrCodeUrl, merchantName, isActive, phonepeEnabled } = req.body;
    if (!upiId || !qrCodeUrl || !merchantName) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    // Always keep only one latest settings document (replace if exists)
    const existing = await PaymentSettings.findOne().sort({ updatedAt: -1 });
    if (existing) {
      existing.upiId = upiId;
      existing.qrCodeUrl = qrCodeUrl;
      existing.merchantName = merchantName;
      existing.isActive = isActive !== undefined ? isActive : existing.isActive;
      existing.phonepeEnabled = phonepeEnabled !== undefined ? phonepeEnabled : existing.phonepeEnabled;
      await existing.save();
      return res.json({ message: '✅ Settings updated successfully', settings: existing });
    }

    const newSettings = new PaymentSettings({ 
      upiId, 
      qrCodeUrl, 
      merchantName, 
      isActive,
      phonepeEnabled: phonepeEnabled !== undefined ? phonepeEnabled : true
    });
    await newSettings.save();
    return res.status(201).json({ message: '✅ Settings saved successfully', settings: newSettings });
  } catch (err) {
    console.error('❌ Error saving payment settings:', err);
    return res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
