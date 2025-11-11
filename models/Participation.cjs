const mongoose = require('mongoose');

const participationSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  contentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Content',
    required: true
  },
  answers: [
    {
      questionId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'ParticipationQuestion',
        required: true
      },
      questionText: String,
      selectedOption: {
        type: String,
        required: true
      },
      answeredAt: {
        type: Date,
        default: Date.now
      }
    }
  ],
  totalScore: {
    type: Number,
    default: 0
  },
  submittedAt: {
    type: Date,
    default: Date.now
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Index for finding participations
participationSchema.index({ userId: 1, contentId: 1 }); // For checking if user already participated
participationSchema.index({ contentId: 1 }); // For getting all participations for content

module.exports = mongoose.model('Participation', participationSchema);
