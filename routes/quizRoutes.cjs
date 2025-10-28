const express = require('express');
const router = express.Router();
const Quiz = require('../models/Quiz.cjs');
const QuizParticipant = require('../models/QuizParticipant.cjs');
const Content = require('../models/Content.cjs');
const User = require('../models/User.cjs');
const mongoose = require('mongoose');

// ===== ADMIN ROUTES =====

// GET: Fetch all quizzes for admin management
router.get('/admin/all', async (req, res) => {
  try {
    const quizzes = await Quiz.find().select('contentId contentName isPaid questions');
    res.json({ success: true, quizzes });
  } catch (err) {
    console.error('Error fetching quizzes:', err);
    res.status(500).json({ success: false, message: 'Error fetching quizzes' });
  }
});

// POST: Create or update quiz for a content
router.post('/admin/upsert', async (req, res) => {
  try {
    const { contentId, contentName, isPaid, questions } = req.body;

    if (!contentId || !contentName) {
      return res.status(400).json({ success: false, message: 'Missing contentId or contentName' });
    }

    // Validate questions structure
    if (!Array.isArray(questions) || questions.length === 0) {
      return res.status(400).json({ success: false, message: 'At least one question is required' });
    }

    for (const q of questions) {
      if (!q.questionText || !Array.isArray(q.options) || q.options.length < 2) {
        return res.status(400).json({ success: false, message: 'Each question must have text and at least 2 options' });
      }
      for (const opt of q.options) {
        if (!opt.optionText) {
          return res.status(400).json({ success: false, message: 'Each option must have text' });
        }
      }
    }

    // Find existing quiz or create new
    let quiz = await Quiz.findOne({ contentId });

    if (quiz) {
      // Update existing
      quiz.isPaid = isPaid;
      quiz.questions = questions.map((q, idx) => ({
        ...q,
        questionOrder: idx
      }));
      quiz.updatedAt = new Date();
      await quiz.save();
    } else {
      // Create new
      quiz = new Quiz({
        contentId,
        contentName,
        isPaid,
        questions: questions.map((q, idx) => ({
          ...q,
          questionOrder: idx
        }))
      });
      await quiz.save();
    }

    res.json({ success: true, message: 'Quiz saved successfully', quiz });
  } catch (err) {
    console.error('Error saving quiz:', err);
    res.status(500).json({ success: false, message: 'Error saving quiz' });
  }
});

// GET: Fetch results for a specific quiz
router.get('/admin/results/:contentId', async (req, res) => {
  try {
    const { contentId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(contentId)) {
      return res.status(400).json({ success: false, message: 'Invalid contentId' });
    }

    const results = await QuizParticipant.find({ contentId }).select('userEmail userName selectedOption participatedAt');
    res.json({ success: true, results });
  } catch (err) {
    console.error('Error fetching results:', err);
    res.status(500).json({ success: false, message: 'Error fetching results' });
  }
});

// DELETE: Clear all quiz data for a content (questions + participant data)
router.delete('/admin/clear/:contentId', async (req, res) => {
  try {
    const { contentId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(contentId)) {
      return res.status(400).json({ success: false, message: 'Invalid contentId' });
    }

    // Delete quiz
    const quizDeleteResult = await Quiz.deleteOne({ contentId });

    // Delete all participant data for this quiz
    const participantDeleteResult = await QuizParticipant.deleteMany({ contentId });

    res.json({
      success: true,
      message: 'Quiz and all participant data cleared',
      quizDeleted: quizDeleteResult.deletedCount,
      participantsDeleted: participantDeleteResult.deletedCount
    });
  } catch (err) {
    console.error('Error clearing quiz:', err);
    res.status(500).json({ success: false, message: 'Error clearing quiz' });
  }
});

// ===== USER ROUTES =====

// GET: Fetch quiz questions for a content (user view)
router.get('/user/:contentId', async (req, res) => {
  try {
    const { contentId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(contentId)) {
      return res.status(400).json({ success: false, message: 'Invalid contentId' });
    }

    const quiz = await Quiz.findOne({ contentId });

    if (!quiz) {
      return res.status(404).json({ success: false, message: 'Quiz not found for this content' });
    }

    // Return questions without marking correct answers
    const questionsForUser = quiz.questions.map((q, idx) => ({
      questionIndex: idx,
      questionText: q.questionText,
      options: q.options.map(opt => ({
        optionText: opt.optionText
        // Don't send isCorrect to user
      }))
    }));

    res.json({
      success: true,
      contentId,
      contentName: quiz.contentName,
      isPaid: quiz.isPaid,
      questions: questionsForUser,
      totalQuestions: quiz.questions.length
    });
  } catch (err) {
    console.error('Error fetching quiz:', err);
    res.status(500).json({ success: false, message: 'Error fetching quiz' });
  }
});

// POST: Submit quiz answers
router.post('/user/submit', async (req, res) => {
  try {
    const { userId, contentId, userEmail, userName, answers } = req.body;

    if (!userId || !contentId || !userEmail || !Array.isArray(answers)) {
      return res.status(400).json({ success: false, message: 'Missing required fields' });
    }

    if (!mongoose.Types.ObjectId.isValid(userId) || !mongoose.Types.ObjectId.isValid(contentId)) {
      return res.status(400).json({ success: false, message: 'Invalid userId or contentId' });
    }

    // Get the quiz to check answers
    const quiz = await Quiz.findOne({ contentId });

    if (!quiz) {
      return res.status(404).json({ success: false, message: 'Quiz not found' });
    }

    // Calculate score
    let score = 0;
    const processedAnswers = answers.map((answer, idx) => {
      const question = quiz.questions[answer.questionIndex];
      const selectedOption = question.options.find(opt => opt.optionText === answer.selectedOption);
      const isCorrect = selectedOption ? selectedOption.isCorrect : false;

      if (isCorrect) score++;

      return {
        questionIndex: answer.questionIndex,
        questionText: question.questionText,
        selectedOption: answer.selectedOption,
        isCorrect
      };
    });

    // Save participant data
    const participant = new QuizParticipant({
      quizId: quiz._id,
      contentId,
      contentName: quiz.contentName,
      userId,
      userEmail,
      userName,
      answers: processedAnswers,
      score,
      totalQuestions: quiz.questions.length
    });

    await participant.save();

    res.json({
      success: true,
      message: 'Quiz submitted successfully',
      score,
      totalQuestions: quiz.questions.length,
      percentage: Math.round((score / quiz.questions.length) * 100)
    });
  } catch (err) {
    console.error('Error submitting quiz:', err);
    res.status(500).json({ success: false, message: 'Error submitting quiz' });
  }
});

// GET: Check if user already participated
router.get('/user/check/:contentId/:userId', async (req, res) => {
  try {
    const { contentId, userId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(contentId) || !mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ success: false, message: 'Invalid IDs' });
    }

    const participation = await QuizParticipant.findOne({ contentId, userId });

    res.json({
      success: true,
      hasParticipated: !!participation,
      participation: participation || null
    });
  } catch (err) {
    console.error('Error checking participation:', err);
    res.status(500).json({ success: false, message: 'Error checking participation' });
  }
});

module.exports = router;
