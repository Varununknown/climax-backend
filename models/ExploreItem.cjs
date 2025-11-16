const mongoose = require('mongoose');

const ExploreItemSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true
    },
    description: {
      type: String,
      trim: true
    },
    imageUrl: {
      type: String,
      required: true
    },
    position: {
      type: Number,
      default: 1
    },
    isActive: {
      type: Boolean,
      default: true
    },
    link: {
      type: String,
      default: null
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model('ExploreItem', ExploreItemSchema);
