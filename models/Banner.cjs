const mongoose = require('mongoose');

const bannerSchema = new mongoose.Schema({
  title: { 
    type: String, 
    required: true,
    trim: true
  },
  description: { 
    type: String, 
    default: ''
  },
  imageUrl: { 
    type: String, 
    required: true,
    trim: true
  },
  category: { 
    type: String, 
    required: true,
    trim: true
  },
  position: { 
    type: Number, 
    default: 1,
    min: 1,
    max: 10
  },
  isActive: { 
    type: Boolean, 
    default: true
  },
  link: { 
    type: String, 
    default: '',
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

module.exports = mongoose.model('Banner', bannerSchema);
