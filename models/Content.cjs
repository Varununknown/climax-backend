const mongoose = require('mongoose');

const contentSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, required: true },
  videoUrl: { type: String, required: true },
  thumbnail: { type: String, required: true },
  category: { type: String, required: true },
  type: { type: String, enum: ['movie', 'series', 'show'], required: true },
  duration: { type: Number, required: true }, // in seconds
  climaxTimestamp: { type: Number, required: true }, // in seconds
  premiumPrice: { type: Number, required: true },
  genre: { type: [String], default: [] },
  rating: { type: Number, default: 0 },
  isActive: { type: Boolean, default: true },
  createdAt: {
    type: Date,
    default: () => Date.now()
  }
});

module.exports = mongoose.model('Content', contentSchema);
