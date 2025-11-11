const mongoose = require('mongoose');

const contentSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  description: { type: String, required: true, trim: true },
  videoUrl: { type: String, required: false, trim: true }, // Made optional for upcoming content
  thumbnail: { type: String, required: true, trim: true },
  category: { type: String, required: true, trim: true },
  type: { type: String, enum: ['movie', 'series', 'show'], required: true },
  duration: { type: Number, required: true }, // in seconds
  climaxTimestamp: { type: Number, required: true }, // in seconds
  premiumPrice: { type: Number, required: true },
  genre: { type: [String], default: [] },
  rating: { type: Number, default: 0 },
  isActive: { type: Boolean, default: true },
  language: { 
    type: String, 
    required: true,
    enum: ['English', 'Hindi', 'Tamil', 'Telugu', 'Malayalam', 'Kannada', 'Bengali', 'Marathi', 'Gujarati', 'Punjabi'],
    trim: true
  },
  createdAt: {
    type: Date,
    default: () => Date.now()
  },
  updatedAt: {
    type: Date,
    default: () => Date.now()
  }
});

// Update updatedAt on save
contentSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

module.exports = mongoose.model('Content', contentSchema);
