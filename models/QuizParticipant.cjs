const mongoose = require('mongoose');

const quizParticipantSchema = new mongoose.Schema({
  quizId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Quiz',
    required: true
  },
  contentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Content',
    required: true
  },
  contentName: {
    type: String,
    required: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  userEmail: {
    type: String,
    required: true
  },
  userName: {
    type: String,
    required: false
  },
  answers: [
    {
      questionIndex: {
        type: Number,
        required: true
      },
      questionText: {
        type: String,
        required: true
      },
      selectedOption: {
        type: String,
        required: true
      },
      isCorrect: {
        type: Boolean,
        default: false
      }
    }
  ],
  score: {
    type: Number,
    default: 0
  },
  totalQuestions: {
    type: Number,
    required: true
  },
  participatedAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('QuizParticipant', quizParticipantSchema);
