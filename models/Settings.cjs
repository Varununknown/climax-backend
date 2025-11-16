const mongoose = require('mongoose');

const settingsSchema = new mongoose.Schema({
  settingKey: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  settingValue: {
    type: mongoose.Schema.Types.Mixed,
    required: true
  },
  description: {
    type: String,
    default: ''
  },
  updatedAt: {
    type: Date,
    default: () => Date.now()
  }
});

// Update updatedAt on save
settingsSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

module.exports = mongoose.model('Settings', settingsSchema);
