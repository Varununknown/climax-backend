const mongoose = require('mongoose');

const participationSettingsSchema = new mongoose.Schema({
  contentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Content',
    required: true,
    unique: true // Only one settings per content
  },
  isPaid: {
    type: Boolean,
    default: false // Free by default
  },
  pricePerParticipation: {
    type: Number,
    default: 0, // 0 if free
    min: 0
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Index for finding settings by content
participationSettingsSchema.index({ contentId: 1 });

module.exports = mongoose.model('ParticipationSettings', participationSettingsSchema);
