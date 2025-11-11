const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Participation = require('../models/Participation.cjs');
const ParticipationQuestion = require('../models/ParticipationQuestion.cjs');
const ParticipationSettings = require('../models/ParticipationSettings.cjs');
const Content = require('../models/Content.cjs');
const User = require('../models/User.cjs');

// Middleware to check if user is authenticated
const requireAuth = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    return res.status(401).json({ success: false, message: 'Unauthorized' });
  }
  // Token validation happens in server.cjs
  next();
};

// Middleware to check if user is admin
const requireAdmin = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    // In a real app, you'd verify the JWT here
    // For now, check if user has admin role from the decoded token
    // This assumes the token was already verified in server.cjs

    next();
  } catch (err) {
    res.status(401).json({ success: false, message: 'Unauthorized' });
  }
};

// ==================== ADMIN ROUTES ====================

// GET all contents with participation status
router.get('/admin/contents', requireAuth, async (req, res) => {
  try {
    const contents = await Content.find().select('_id title image category premiumPrice');
    
    // Get participation counts and settings for each content
    const contentsWithStatus = await Promise.all(
      contents.map(async (content) => {
        const questions = await ParticipationQuestion.countDocuments({ contentId: content._id });
        const participations = await Participation.countDocuments({ contentId: content._id });
        const settings = await ParticipationSettings.findOne({ contentId: content._id });

        return {
          ...content.toObject(),
          questionCount: questions,
          participationCount: participations,
          isPaid: settings?.isPaid || false,
          price: settings?.pricePerParticipation || 0,
          isActive: settings?.isActive || false
        };
      })
    );

    res.json({ success: true, data: contentsWithStatus });
  } catch (err) {
    console.error('❌ Error fetching contents:', err);
    res.status(500).json({ success: false, message: 'Error fetching contents', error: err.message });
  }
});

// POST create/update participation settings
router.post('/admin/settings/:contentId', requireAuth, async (req, res) => {
  try {
    const { contentId } = req.params;
    const { isPaid, pricePerParticipation, isActive } = req.body;

    if (!mongoose.Types.ObjectId.isValid(contentId)) {
      return res.status(400).json({ success: false, message: 'Invalid content ID' });
    }

    // Check if content exists
    const content = await Content.findById(contentId);
    if (!content) {
      return res.status(404).json({ success: false, message: 'Content not found' });
    }

    // Upsert settings
    let settings = await ParticipationSettings.findOne({ contentId });
    
    if (settings) {
      settings.isPaid = isPaid;
      settings.pricePerParticipation = isPaid ? pricePerParticipation : 0;
      settings.isActive = isActive;
      settings.updatedAt = new Date();
    } else {
      settings = new ParticipationSettings({
        contentId,
        isPaid,
        pricePerParticipation: isPaid ? pricePerParticipation : 0,
        isActive
      });
    }

    await settings.save();
    res.json({ success: true, data: settings });
  } catch (err) {
    console.error('❌ Error saving settings:', err);
    res.status(500).json({ success: false, message: 'Error saving settings', error: err.message });
  }
});

// GET settings for content
router.get('/admin/settings/:contentId', requireAuth, async (req, res) => {
  try {
    const { contentId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(contentId)) {
      return res.status(400).json({ success: false, message: 'Invalid content ID' });
    }

    const settings = await ParticipationSettings.findOne({ contentId });
    
    res.json({ 
      success: true, 
      data: settings || {
        contentId,
        isPaid: false,
        pricePerParticipation: 0,
        isActive: false
      }
    });
  } catch (err) {
    console.error('❌ Error fetching settings:', err);
    res.status(500).json({ success: false, message: 'Error fetching settings', error: err.message });
  }
});

// POST add question
router.post('/admin/questions/:contentId', requireAuth, async (req, res) => {
  try {
    const { contentId } = req.params;
    const { questionText, options, correctAnswer, isRequired } = req.body;

    console.log('📥 Received POST request to create question');
    console.log('📝 Content ID:', contentId);
    console.log('📝 Question:', { questionText, options, correctAnswer, isRequired });

    if (!mongoose.Types.ObjectId.isValid(contentId)) {
      console.error('❌ Invalid content ID format:', contentId);
      return res.status(400).json({ success: false, message: 'Invalid content ID' });
    }

    if (!questionText || !options || options.length < 2) {
      console.error('❌ Validation failed:', { questionText, optionsLength: options?.length });
      return res.status(400).json({ success: false, message: 'Question must have text and at least 2 options' });
    }

    // Check if content exists
    const content = await Content.findById(contentId);
    if (!content) {
      console.error('❌ Content not found:', contentId);
      return res.status(404).json({ success: false, message: 'Content not found' });
    }

    console.log('✅ Content found:', content.title);

    const question = new ParticipationQuestion({
      contentId,
      questionText,
      options,
      correctAnswer: correctAnswer || null,
      isRequired: isRequired !== false
    });

    await question.save();
    console.log('✅ Question saved successfully:', question._id);
    
    res.json({ success: true, data: question });
  } catch (err) {
    console.error('❌ Error creating question:', err);
    console.error('❌ Stack trace:', err.stack);
    res.status(500).json({ success: false, message: 'Error creating question', error: err.message });
  }
});

// GET all questions for content
router.get('/admin/questions/:contentId', requireAuth, async (req, res) => {
  try {
    const { contentId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(contentId)) {
      return res.status(400).json({ success: false, message: 'Invalid content ID' });
    }

    const questions = await ParticipationQuestion.find({ contentId }).sort({ createdAt: 1 });
    res.json({ success: true, data: questions });
  } catch (err) {
    console.error('❌ Error fetching questions:', err);
    res.status(500).json({ success: false, message: 'Error fetching questions', error: err.message });
  }
});

// DELETE question
router.delete('/admin/questions/:questionId', requireAuth, async (req, res) => {
  try {
    const { questionId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(questionId)) {
      return res.status(400).json({ success: false, message: 'Invalid question ID' });
    }

    const question = await ParticipationQuestion.findByIdAndDelete(questionId);
    if (!question) {
      return res.status(404).json({ success: false, message: 'Question not found' });
    }

    // Also delete related participations
    await Participation.updateMany(
      { 'answers.questionId': questionId },
      { $pull: { answers: { questionId } } }
    );

    res.json({ success: true, message: 'Question deleted' });
  } catch (err) {
    console.error('❌ Error deleting question:', err);
    res.status(500).json({ success: false, message: 'Error deleting question', error: err.message });
  }
});

// GET participation results for content
router.get('/admin/results/:contentId', requireAuth, async (req, res) => {
  try {
    const { contentId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(contentId)) {
      return res.status(400).json({ success: false, message: 'Invalid content ID' });
    }

    const content = await Content.findById(contentId).select('title');
    if (!content) {
      return res.status(404).json({ success: false, message: 'Content not found' });
    }

    // Get all participations for this content with user details
    const participations = await Participation.find({ contentId })
      .populate('userId', 'email name')
      .sort({ submittedAt: -1 });

    // Format results
    const results = participations.map(p => ({
      _id: p._id,
      userEmail: p.userId?.email || 'Unknown',
      userName: p.userId?.name || 'Unknown',
      answers: p.answers,
      submittedAt: p.submittedAt
    }));

    res.json({ success: true, data: { contentTitle: content.title, results } });
  } catch (err) {
    console.error('❌ Error fetching results:', err);
    res.status(500).json({ success: false, message: 'Error fetching results', error: err.message });
  }
});

// DELETE all participation data for content (questions + responses)
router.delete('/admin/clear/:contentId', requireAuth, async (req, res) => {
  try {
    const { contentId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(contentId)) {
      return res.status(400).json({ success: false, message: 'Invalid content ID' });
    }

    // Delete all questions for this content
    await ParticipationQuestion.deleteMany({ contentId });

    // Delete all participations for this content
    await Participation.deleteMany({ contentId });

    // Delete settings for this content
    await ParticipationSettings.deleteOne({ contentId });

    res.json({ success: true, message: 'All participation data cleared for this content' });
  } catch (err) {
    console.error('❌ Error clearing data:', err);
    res.status(500).json({ success: false, message: 'Error clearing data', error: err.message });
  }
});

// ==================== USER ROUTES ====================

// GET questions for content
router.get('/user/:contentId/questions', async (req, res) => {
  try {
    const { contentId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(contentId)) {
      return res.status(400).json({ success: false, message: 'Invalid content ID' });
    }

    const content = await Content.findById(contentId).select('title image');
    if (!content) {
      return res.status(404).json({ success: false, message: 'Content not found' });
    }

    const settings = await ParticipationSettings.findOne({ contentId });
    if (!settings || !settings.isActive) {
      return res.status(404).json({ success: false, message: 'Participation not available for this content' });
    }

    const questions = await ParticipationQuestion.find({ contentId }).select('-correctAnswer');

    res.json({ 
      success: true, 
      data: {
        content: { _id: content._id, title: content.title, image: content.image },
        settings: { isPaid: settings.isPaid, price: settings.pricePerParticipation },
        questions
      }
    });
  } catch (err) {
    console.error('❌ Error fetching questions:', err);
    res.status(500).json({ success: false, message: 'Error fetching questions', error: err.message });
  }
});

// GET user participation status for content
router.get('/user/:contentId/status', requireAuth, async (req, res) => {
  try {
    const { contentId } = req.params;
    const userId = req.user?.id || req.headers['x-user-id'];

    if (!userId || !mongoose.Types.ObjectId.isValid(contentId)) {
      return res.status(400).json({ success: false, message: 'Invalid parameters' });
    }

    const existing = await Participation.findOne({ userId, contentId });
    res.json({ success: true, hasParticipated: !!existing });
  } catch (err) {
    console.error('❌ Error checking status:', err);
    res.status(500).json({ success: false, message: 'Error checking status', error: err.message });
  }
});

// POST submit participation answers
router.post('/user/:contentId/submit', requireAuth, async (req, res) => {
  try {
    const { contentId } = req.params;
    const { answers } = req.body;
    const userId = req.user?.id || req.headers['x-user-id'];

    if (!userId || !mongoose.Types.ObjectId.isValid(contentId)) {
      return res.status(400).json({ success: false, message: 'Invalid parameters' });
    }

    // Check if user already participated
    const existing = await Participation.findOne({ userId, contentId });
    if (existing) {
      return res.status(400).json({ success: false, message: 'You have already participated' });
    }

    // Validate answers
    if (!Array.isArray(answers) || answers.length === 0) {
      return res.status(400).json({ success: false, message: 'Answers required' });
    }

    // Create participation record
    const participation = new Participation({
      userId,
      contentId,
      answers: answers.map(a => ({
        questionId: a.questionId,
        selectedOption: a.selectedOption
      })),
      submittedAt: new Date()
    });

    await participation.save();

    res.json({ success: true, message: 'Participation recorded', data: participation });
  } catch (err) {
    console.error('❌ Error submitting participation:', err);
    res.status(500).json({ success: false, message: 'Error submitting participation', error: err.message });
  }
});

module.exports = router;
