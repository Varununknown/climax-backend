const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User', // ✅ reference to User model
    required: true
  },
  contentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Content', // ✅ reference to Content model
    required: true
  },
  amount: {
    type: Number,
    required: true
  },
  transactionId: {
    type: String,
    required: true,
    unique: true // globally unique
  },
  paymentMethod: {
    type: String,
    enum: ['upi', 'payu'],
    default: 'upi'
  },
  gateway: {
    type: String,
    enum: ['upi', 'payu', 'other'],
    default: 'upi'
  },
  paymentType: {
    type: String,
    enum: ['premium-content', 'fest-participation'],
    default: 'premium-content'
  },
  payuTransactionId: {
    type: String,
    default: null
  },
  paymentDate: {
    type: Date,
    default: () => Date.now()
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'declined'],
    default: 'approved', // 🚀 AUTO-APPROVE all payments
    required: true // ✅ CRITICAL: Make sure status is always set
  }
}, { timestamps: true }); // adds createdAt and updatedAt automatically

// Prevent duplicate payment for same user-content-paymentType
paymentSchema.index({ userId: 1, contentId: 1, paymentType: 1 }, { unique: true });

module.exports = mongoose.model('Payment', paymentSchema);
