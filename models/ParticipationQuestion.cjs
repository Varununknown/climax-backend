const mongoose = require('mongoose');

const participationQuestionSchema = new mongoose.Schema({
  contentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Content',
    required: true
  },
  questionText: {
    type: String,
    required: true,
    trim: true
  },
  options: {
    type: [String],
    required: true,
    validate: {
      validator: function(v) {
        return v.length >= 2; // At least 2 options
      },
      message: 'Question must have at least 2 options'
    }
  },
  correctAnswer: {
    type: String,
    default: null // Can be null if questions are just for collecting data, not scoring
  },
  isRequired: {
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

// Index for finding questions by content
participationQuestionSchema.index({ contentId: 1 });

module.exports = mongoose.model('ParticipationQuestion', participationQuestionSchema);
