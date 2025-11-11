const express = require('express');
const router = express.Router();
const Content = require('../models/Content.cjs');
const { optimizeVideoUrl, generateAdaptiveUrls, prewarmCDNCache } = require('../utils/cdnHelper.cjs');

// GET all contents with CDN optimization
router.get('/', async (req, res) => {
  try {
    const contents = await Content.find().sort({ createdAt: -1 });
    
    console.log(`📊 GET /contents: Returning ${contents.length} items`);
    contents.forEach((c, i) => {
      console.log(`   ${i + 1}. ${c.title} (ID: ${c._id})`);
    });
    
    // Optimize all video URLs for CDN delivery
    const optimizedContents = contents.map(content => ({
      ...content.toObject(),
      videoUrl: optimizeVideoUrl(content.videoUrl),
      thumbnail: content.thumbnail // Keep thumbnails optimized too
    }));
    
    res.json(optimizedContents);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ✅ GET content by ID with ULTRA-FAST CDN optimization  
router.get('/:id', async (req, res) => {
  try {
    // Validate and sanitize ID
    let id = req.params.id;
    if (!id || typeof id !== 'string') {
      return res.status(400).json({ error: 'Invalid content ID format' });
    }
    
    // Remove any unwanted characters or indices (e.g., "123abc:1" -> "123abc")
    id = id.split(':')[0].trim();
    
    if (!id) {
      return res.status(400).json({ error: 'Content ID cannot be empty' });
    }
    
    console.log('🔍 Retrieving content ID:', id);
    
    const content = await Content.findById(id);
    if (!content) {
      return res.status(404).json({ message: 'Content not found' });
    }
    
    // Generate adaptive streaming URLs for all qualities
    const adaptiveUrls = generateAdaptiveUrls(content.videoUrl);
    
    // Pre-warm CDN cache for instant loading
    prewarmCDNCache(content.videoUrl);
    
    // Return content with Amazon Prime Video level optimizations
    const optimizedContent = {
      ...content.toObject(),
      videoUrl: optimizeVideoUrl(content.videoUrl, 'auto'),
      adaptiveUrls: adaptiveUrls, // Multiple quality URLs
      thumbnail: optimizeVideoUrl(content.thumbnail, '720p'),
      cdnOptimized: true,
      streamingReady: true
    };
    
    // Set aggressive caching headers
    res.set({
      'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400',
      'X-CDN-Optimized': 'true',
      'X-Streaming-Ready': 'true'
    });
    
    res.json(optimizedContent);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// POST new content
router.post('/', async (req, res) => {
  try {
    console.log('📥 POST /contents - Received request');
    console.log('📥 Request headers:', { 
      'content-type': req.headers['content-type'],
      'user-agent': req.headers['user-agent']?.substring(0, 50)
    });
    console.log('📥 Request body keys:', Object.keys(req.body));
    
    const {
      title,
      description,
      genre,
      duration,
      type,
      rating,
      premiumPrice,
      category,
      climaxTimestamp,
      thumbnail,
      videoUrl,
      language
    } = req.body;

    console.log('📥 Extracted fields:', {
      title: title ? '✓' : '✗',
      description: description ? '✓' : '✗',
      genre: genre ? '✓' : '✗',
      duration: duration ? '✓' : '✗',
      type: type ? '✓' : '✗',
      rating: rating !== undefined ? '✓' : '✗',
      premiumPrice: premiumPrice ? '✓' : '✗',
      category: category ? '✓' : '✗',
      climaxTimestamp: climaxTimestamp !== undefined ? '✓' : '✗',
      thumbnail: thumbnail ? '✓' : '✗',
      videoUrl: videoUrl ? '✓' : '✗',
      language: language ? '✓' : '✗'
    });

    // Enhanced validation
    if (!title || !title.trim()) {
      console.log('❌ Validation failed: Title is required');
      return res.status(400).json({ error: 'Title is required' });
    }
    if (!description || !description.trim()) {
      console.log('❌ Validation failed: Description is required');
      return res.status(400).json({ error: 'Description is required' });
    }
    if (!genre) {
      console.log('❌ Validation failed: Genre is required');
      return res.status(400).json({ error: 'Genre is required' });
    }
    if (!duration) {
      console.log('❌ Validation failed: Duration is required');
      return res.status(400).json({ error: 'Duration is required' });
    }
    if (!type) {
      console.log('❌ Validation failed: Type is required');
      return res.status(400).json({ error: 'Type is required' });
    }
    if (rating === undefined) {
      console.log('❌ Validation failed: Rating is required');
      return res.status(400).json({ error: 'Rating is required' });
    }
    if (!category) {
      console.log('❌ Validation failed: Category is required');
      return res.status(400).json({ error: 'Category is required' });
    }
    if (climaxTimestamp === undefined) {
      console.log('❌ Validation failed: Climax timestamp is required');
      return res.status(400).json({ error: 'Climax timestamp is required' });
    }
    if (!thumbnail) {
      console.log('❌ Validation failed: Thumbnail is required');
      return res.status(400).json({ error: 'Thumbnail is required' });
    }
    if (!language) {
      console.log('❌ Validation failed: Language is required');
      return res.status(400).json({ error: 'Language is required' });
    }

    // Validate language enum
    const validLanguages = ['English', 'Hindi', 'Tamil', 'Telugu', 'Malayalam', 'Kannada', 'Bengali', 'Marathi', 'Gujarati', 'Punjabi'];
    if (!validLanguages.includes(language)) {
      console.log(`❌ Validation failed: Invalid language "${language}"`);
      return res.status(400).json({ error: 'Invalid language selection' });
    }

    const parsedClimax = Number(climaxTimestamp);
    if (isNaN(parsedClimax)) {
      console.log('❌ Validation failed: climaxTimestamp must be a number');
      return res.status(400).json({ error: 'climaxTimestamp must be a number (in seconds)' });
    }

    console.log('✅ All validations passed, creating new content...');
    const newContent = new Content({
      title: title.trim(),
      description: description.trim(),
      genre: typeof genre === 'string' ? genre.split(',').map(g => g.trim()) : genre,
      duration: Number(duration),
      type,
      rating: Number(rating),
      premiumPrice: Number(premiumPrice),
      category: category.trim(),
      climaxTimestamp: parsedClimax,
      thumbnail: thumbnail.trim(),
      videoUrl: videoUrl ? videoUrl.trim() : '',
      language
    });

    console.log('💾 Saving content to database...');
    await newContent.save();
    
    console.log('✅ Content created successfully:', newContent._id);
    console.log('📤 Sending response with created content...');
    res.status(201).json(newContent);
  } catch (err) {
    console.error('❌ Content creation error:', err);
    console.error('❌ Error type:', err.constructor.name);
    console.error('❌ Error message:', err.message);
    
    // Handle validation errors from mongoose
    if (err.name === 'ValidationError') {
      const messages = Object.values(err.errors).map(e => e.message);
      console.log('❌ Mongoose validation errors:', messages);
      return res.status(400).json({ error: messages.join(', ') });
    }
    
    console.error('❌ Stack trace:', err.stack);
    res.status(500).json({ error: 'Server error while creating content: ' + err.message });
  }
});

// PUT update content by ID
router.put('/:id', async (req, res) => {
  try {
    let { id } = req.params;
    const updateData = req.body;

    console.log('📥 PUT /contents/:id - Received request');
    console.log('🆔 Raw ID from params:', id);
    console.log('📥 Request body keys:', Object.keys(updateData));

    // Validate and sanitize ID
    if (!id || typeof id !== 'string') {
      console.log('❌ Validation failed: Invalid content ID format');
      return res.status(400).json({ error: 'Invalid content ID format' });
    }
    
    // Remove any unwanted characters or indices (e.g., "123abc:1" -> "123abc")
    id = id.split(':')[0].trim();
    
    console.log('🔄 After sanitization, ID:', id);
    console.log('🔍 ID length:', id.length);
    console.log('🔍 ID is valid MongoDB format:', /^[0-9a-f]{24}$/i.test(id));
    
    if (!id) {
      console.log('❌ Validation failed: Content ID cannot be empty');
      return res.status(400).json({ error: 'Content ID cannot be empty' });
    }

    console.log('� Searching for content with ID:', id);

    // Validate language if provided
    if (updateData.language) {
      const validLanguages = ['English', 'Hindi', 'Tamil', 'Telugu', 'Malayalam', 'Kannada', 'Bengali', 'Marathi', 'Gujarati', 'Punjabi'];
      if (!validLanguages.includes(updateData.language)) {
        console.log(`❌ Validation failed: Invalid language "${updateData.language}"`);
        return res.status(400).json({ error: 'Invalid language selection' });
      }
    }

    // Validate required fields if provided
    if (updateData.title !== undefined && !updateData.title.trim()) {
      console.log('❌ Validation failed: Title cannot be empty');
      return res.status(400).json({ error: 'Title cannot be empty' });
    }
    if (updateData.description !== undefined && !updateData.description.trim()) {
      console.log('❌ Validation failed: Description cannot be empty');
      return res.status(400).json({ error: 'Description cannot be empty' });
    }
    if (updateData.category !== undefined && !updateData.category.trim()) {
      console.log('❌ Validation failed: Category cannot be empty');
      return res.status(400).json({ error: 'Category cannot be empty' });
    }

    // Trim string fields
    if (updateData.title) updateData.title = updateData.title.trim();
    if (updateData.description) updateData.description = updateData.description.trim();
    if (updateData.category) updateData.category = updateData.category.trim();
    if (updateData.thumbnail) updateData.thumbnail = updateData.thumbnail.trim();
    if (updateData.videoUrl) updateData.videoUrl = updateData.videoUrl.trim();

    console.log('✅ All validations passed, finding and updating content...');
    
    // Try to find the content first
    const contentBefore = await Content.findById(id);
    console.log('🔍 Content lookup result:', contentBefore ? `Found: ${contentBefore.title}` : 'NOT FOUND');
    
    if (!contentBefore) {
      console.log('❌ Content not found with ID:', id);
      console.log('⚠️ Available contents:', (await Content.find({}, 'title _id')).slice(0, 5));
      return res.status(404).json({ error: 'Content not found' });
    }
    
    const updated = await Content.findByIdAndUpdate(id, updateData, { new: true, runValidators: true });
    
    console.log('✅ Content updated successfully:', updated.title, '(ID:', updated._id, ')');
    console.log('📤 Sending updated content as response...');
    res.json(updated);
  } catch (err) {
    console.error('❌ Content update error:', err);
    console.error('❌ Error type:', err.constructor.name);
    console.error('❌ Error message:', err.message);
    
    // Handle validation errors from mongoose
    if (err.name === 'ValidationError') {
      const messages = Object.values(err.errors).map(e => e.message);
      console.log('❌ Mongoose validation errors:', messages);
      return res.status(400).json({ error: messages.join(', ') });
    }
    
    console.error('❌ Stack trace:', err.stack);
    res.status(400).json({ error: 'Server error while updating content: ' + err.message });
  }
});

// DELETE content by ID
router.delete('/:id', async (req, res) => {
  try {
    let { id } = req.params;
    
    // Validate and sanitize ID
    if (!id || typeof id !== 'string') {
      return res.status(400).json({ error: 'Invalid content ID format' });
    }
    
    // Remove any unwanted characters or indices (e.g., "123abc:1" -> "123abc")
    id = id.split(':')[0].trim();
    
    if (!id) {
      return res.status(400).json({ error: 'Content ID cannot be empty' });
    }
    
    console.log('🗑️ Deleting content:', id);
    
    const deleted = await Content.findByIdAndDelete(id);
    
    if (!deleted) {
      return res.status(404).json({ error: 'Content not found' });
    }
    
    console.log('✅ Content deleted successfully:', id);
    res.status(204).end();
  } catch (err) {
    console.error('❌ Content delete error:', err);
    res.status(400).json({ error: 'Server error while deleting content: ' + err.message });
  }
});

// 🌱 SEED endpoint - Add sample content to database
router.post('/seed', async (req, res) => {
  try {
    console.log('🌱 Seed endpoint called - checking existing content...');
    
    // Check if content already exists
    const existingCount = await Content.countDocuments();
    if (existingCount > 0) {
      console.log(`✅ Content already exists (${existingCount} items)`);
      return res.json({ 
        message: 'Content already exists', 
        count: existingCount,
        note: 'To reset, delete all content first'
      });
    }
    
    console.log('📝 Creating sample content...');
    const sampleContent = [
      {
        title: 'The Dark Knight',
        description: 'When the menace known as the Joker emerges from his mysterious past, he wreaks havoc on Gotham. Batman must accept one of the greatest test to fight injustice.',
        videoUrl: 'https://sample-videos.com/zip/10/mp4/SampleVideo_1280x720_1mb.mp4',
        thumbnail: 'https://images.unsplash.com/photo-1509347528160-9a9e33742cdb?w=500&h=750&fit=crop',
        category: 'Action',
        type: 'movie',
        duration: 152,
        climaxTimestamp: 120,
        premiumPrice: 49,
        genre: ['Action', 'Crime', 'Drama'],
        rating: 9.0,
        language: 'English',
        isActive: true
      },
      {
        title: 'Stranger Things',
        description: 'When a young boy disappears, his friends, family and local police uncover a mystery involving secret government experiments and terrifying supernatural forces.',
        videoUrl: 'https://sample-videos.com/zip/10/mp4/SampleVideo_1280x720_2mb.mp4',
        thumbnail: 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=500&h=750&fit=crop',
        category: 'Drama',
        type: 'series',
        duration: 45,
        climaxTimestamp: 35,
        premiumPrice: 29,
        genre: ['Drama', 'Fantasy', 'Horror'],
        rating: 8.7,
        language: 'English',
        isActive: true
      },
      {
        title: 'Inception',
        description: 'A skilled thief who steals corporate secrets through dream-sharing technology is given the inverse task of planting an idea.',
        videoUrl: 'https://sample-videos.com/zip/10/mp4/SampleVideo_1280x720_1mb.mp4',
        thumbnail: 'https://images.unsplash.com/photo-1518676590629-3dcbd9c5a5c9?w=500&h=750&fit=crop',
        category: 'Sci-Fi',
        type: 'movie',
        duration: 148,
        climaxTimestamp: 110,
        premiumPrice: 49,
        genre: ['Sci-Fi', 'Action', 'Thriller'],
        rating: 8.8,
        language: 'English',
        isActive: true
      },
      {
        title: 'Breaking Bad',
        description: 'A high school chemistry teacher diagnosed with inoperable lung cancer turns to manufacturing and selling methamphetamine with his former student.',
        videoUrl: 'https://sample-videos.com/zip/10/mp4/SampleVideo_1280x720_2mb.mp4',
        thumbnail: 'https://images.unsplash.com/photo-1495909406351-987e042f556b?w=500&h=750&fit=crop',
        category: 'Drama',
        type: 'series',
        duration: 47,
        climaxTimestamp: 35,
        premiumPrice: 29,
        genre: ['Crime', 'Drama', 'Thriller'],
        rating: 9.5,
        language: 'English',
        isActive: true
      },
      {
        title: 'Interstellar',
        description: 'A team of explorers travel through a wormhole in space in an attempt to ensure humanity\'s survival.',
        videoUrl: 'https://sample-videos.com/zip/10/mp4/SampleVideo_1280x720_1mb.mp4',
        thumbnail: 'https://images.unsplash.com/photo-1518676590629-3dcbd9c5a5c9?w=500&h=750&fit=crop',
        category: 'Sci-Fi',
        type: 'movie',
        duration: 169,
        climaxTimestamp: 140,
        premiumPrice: 49,
        genre: ['Sci-Fi', 'Drama', 'Adventure'],
        rating: 8.6,
        language: 'English',
        isActive: true
      },
      {
        title: 'Parasite',
        description: 'Greed and class discrimination threaten the newly formed symbiotic relationship between the wealthy Park family and the destitute Kim clan.',
        videoUrl: 'https://sample-videos.com/zip/10/mp4/SampleVideo_1280x720_2mb.mp4',
        thumbnail: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=500&h=750&fit=crop',
        category: 'Drama',
        type: 'movie',
        duration: 132,
        climaxTimestamp: 100,
        premiumPrice: 39,
        genre: ['Drama', 'Thriller'],
        rating: 8.6,
        language: 'English',
        isActive: true
      }
    ];
    
    const result = await Content.insertMany(sampleContent);
    console.log(`✅ Sample content created: ${result.length} items`);
    
    res.status(201).json({ 
      message: 'Sample content added successfully!', 
      count: result.length, 
      content: result 
    });
    
  } catch (error) {
    console.error('❌ Seed error:', error);
    res.status(500).json({ message: 'Failed to seed content', error: error.message });
  }
});

module.exports = router;
