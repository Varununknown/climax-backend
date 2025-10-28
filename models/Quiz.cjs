const mongoose = require('mongoose');

const quizSchema = new mongoose.Schema({
  contentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Content',
    required: true,
    unique: true
  },
  contentName: {
    type: String,
    required: true
  },
  isPaid: {
    type: Boolean,
    default: false
  },
  questions: [
    {
      questionText: {
        type: String,
        required: true
      },
      options: [
        {
          optionText: {
            type: String,
            required: true
          },
          isCorrect: {
            type: Boolean,
            default: false
          }
        }
      ],
      questionOrder: {
        type: Number,
        default: 0
      }
    }
  ],
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Quiz', quizSchema);
