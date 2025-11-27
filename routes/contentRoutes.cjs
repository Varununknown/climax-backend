const express = require('express');
const router = express.Router();
const Content = require('../models/Content.cjs');
const Analytics = require('../models/Analytics.cjs');
const { optimizeVideoUrl, generateAdaptiveUrls, prewarmCDNCache } = require('../utils/cdnHelper.cjs');

// GET all contents with CDN optimization & RETRY LOGIC
router.get('/', async (req, res) => {
  try {
    console.log('📊 GET /contents - Fetching all items...');
    
    // RETRY LOGIC: Try 5 times with delays
    let contents = null;
    
    for (let attempt = 1; attempt <= 5; attempt++) {
      try {
        console.log(`🔄 List attempt ${attempt}/5...`);
        contents = await Content.find().sort({ createdAt: -1 });
        
        if (contents !== null) {
          console.log(`✅ Fetched ${contents.length} items on attempt ${attempt}`);
          break;
        } else if (attempt < 5) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      } catch (err) {
        console.error(`❌ Attempt ${attempt} failed:`, err.message);
        if (attempt < 5) {
          const waitTime = 500 * attempt;
          await new Promise(resolve => setTimeout(resolve, waitTime));
        }
      }
    }
    
    if (!contents) {
      console.error('❌ Failed to fetch contents after 5 attempts');
      return res.status(500).json({ error: 'Database connection failed' });
    }
    
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
    console.error('❌ Content list error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ✅ GET content by ID with ULTRA-FAST CDN optimization & AGGRESSIVE RETRY LOGIC
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
    
    // AGGRESSIVE RETRY LOGIC: Try 5 times with increasing delays
    let content = null;
    let lastError = null;
    
    for (let attempt = 1; attempt <= 5; attempt++) {
      try {
        console.log(`🔄 Fetch attempt ${attempt}/5...`);
        content = await Content.findById(id);
        
        if (content) {
          console.log(`✅ Content found on attempt ${attempt}: "${content.title}"`);
          break;
        } else {
          if (attempt < 5) {
            const waitTime = 500 * attempt;
            console.log(`⏳ Not found yet, waiting ${waitTime}ms before retry ${attempt}/5...`);
            await new Promise(resolve => setTimeout(resolve, waitTime));
          }
        }
      } catch (err) {
        lastError = err;
        console.error(`❌ Attempt ${attempt} failed:`, err.message);
        if (attempt < 5) {
          const waitTime = 500 * attempt;
          console.log(`⏳ Connection error, waiting ${waitTime}ms before retry ${attempt}/5...`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
        }
      }
    }
    
    if (!content) {
      console.error(`❌ Content NOT found after 5 attempts. ID: ${id}`);
      if (lastError) {
        console.error(`   Last error: ${lastError.message}`);
      }
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
    console.error('❌ Content fetch error:', err.message);
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

    console.log('✅ All validations passed, updating content...');
    
    // RETRY LOGIC: Try 3 times with 1-second delays (handles slow MongoDB connections)
    let updated = null;
    let lastError = null;
    
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        console.log(`� Update attempt ${attempt}/3...`);
        updated = await Content.findByIdAndUpdate(id, updateData, { new: true, runValidators: true });
        
        if (updated) {
          console.log(`✅ Content updated on attempt ${attempt}`);
          console.log('✅ Content updated successfully:', updated.title, '(ID:', updated._id, ')');
          console.log('📤 Sending updated content as response...');
          return res.json(updated);
        } else {
          if (attempt < 3) {
            console.log(`⏳ Content not found, waiting 1 second before retry ${attempt}/3...`);
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        }
      } catch (err) {
        console.error(`❌ Attempt ${attempt} failed:`, err.message);
        lastError = err;
        if (attempt < 3) {
          console.log(`⏳ Connection error, waiting 1 second before retry ${attempt}/3...`);
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
    }
    
    // If we get here, all attempts failed
    console.log('❌ Content not found with ID after 3 attempts:', id);
    console.log('⚠️ Last error:', lastError ? lastError.message : 'Not found');
    return res.status(404).json({ error: 'Content not found' });
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

/* ----------  ANALYTICS ENDPOINTS  ---------- */

// Record a view/watch session
router.post('/:contentId/analytics', async (req, res) => {
  try {
    const { contentId } = req.params;
    const { userId, watchTimeSeconds, completionPercentage, amountPaid, deviceType } = req.body;

    const analytics = new Analytics({
      contentId,
      userId,
      watchTimeSeconds: watchTimeSeconds || 0,
      completionPercentage: completionPercentage || 0,
      amountPaid: amountPaid || 0,
      deviceType: deviceType || 'mobile',
      status: completionPercentage > 90 ? 'completed' : completionPercentage > 20 ? 'in_progress' : 'started'
    });

    await analytics.save();
    console.log('✅ Analytics recorded for content:', contentId);

    res.json({ success: true, message: 'Analytics recorded' });
  } catch (error) {
    console.error('❌ Analytics recording error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get analytics for a specific content
router.get('/:contentId/analytics', async (req, res) => {
  try {
    const { contentId } = req.params;
    const { days = 30 } = req.query;

    const dateFrom = new Date();
    dateFrom.setDate(dateFrom.getDate() - parseInt(days));

    // Fetch all analytics for this content
    const analyticsData = await Analytics.find({
      contentId: contentId,
      viewedAt: { $gte: dateFrom }
    }).populate('userId', 'name email');

    // Calculate metrics
    const totalViews = analyticsData.length;
    const totalRevenue = analyticsData.reduce((sum, a) => sum + (a.amountPaid || 0), 0);
    const avgWatchTime = analyticsData.length > 0 
      ? Math.round(analyticsData.reduce((sum, a) => sum + (a.watchTimeSeconds || 0), 0) / analyticsData.length / 60)
      : 0;
    const avgCompletion = analyticsData.length > 0
      ? Math.round(analyticsData.reduce((sum, a) => sum + (a.completionPercentage || 0), 0) / analyticsData.length)
      : 0;

    const deviceBreakdown = {};
    analyticsData.forEach(a => {
      deviceBreakdown[a.deviceType] = (deviceBreakdown[a.deviceType] || 0) + 1;
    });

    // Get content details
    const content = await Content.findById(contentId);

    res.json({
      success: true,
      contentId,
      title: content?.title || 'Unknown',
      category: content?.category || 'Unknown',
      dateRange: `Last ${days} days`,
      metrics: {
        totalViews,
        totalRevenue,
        avgWatchTime,
        avgCompletion,
        completedViews: analyticsData.filter(a => a.status === 'completed').length
      },
      deviceBreakdown,
      recentViews: analyticsData.slice(-10).reverse().map(a => ({
        userId: a.userId?.name || 'Unknown',
        watchTime: Math.round(a.watchTimeSeconds / 60),
        completion: a.completionPercentage,
        revenue: a.amountPaid,
        device: a.deviceType,
        viewedAt: a.viewedAt
      }))
    });
  } catch (error) {
    console.error('❌ Analytics fetch error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get analytics for all content (admin dashboard)
router.get('/admin/all-analytics', async (req, res) => {
  try {
    const { days = 30 } = req.query;

    const dateFrom = new Date();
    dateFrom.setDate(dateFrom.getDate() - parseInt(days));

    // Fetch all analytics
    const allAnalytics = await Analytics.find({
      viewedAt: { $gte: dateFrom }
    });

    // Get all content
    const allContent = await Content.find({}, { title: 1, category: 1, _id: 1, createdAt: 1 });

    // If no analytics data exists, generate some realistic sample data for demo
    if (allAnalytics.length === 0 && allContent.length > 0) {
      console.log('📊 Generating sample analytics data for demo...');
      const User = require('../models/User.cjs');
      const users = await User.find({}, { _id: 1 }).limit(10);
      
      if (users.length > 0) {
        const sampleAnalytics = [];
        
        for (let i = 0; i < allContent.length; i++) {
          const content = allContent[i];
          // Generate 20-100 views per content
          const viewCount = Math.floor(Math.random() * 80) + 20;
          
          for (let j = 0; j < viewCount; j++) {
            const randomUser = users[Math.floor(Math.random() * users.length)];
            const watchTime = Math.floor(Math.random() * 3600) + 300; // 5 min to 1 hour
            const completion = Math.min(100, Math.floor((watchTime / 3600) * 100));
            
            sampleAnalytics.push({
              contentId: content._id,
              userId: randomUser._id,
              watchTimeSeconds: watchTime,
              completionPercentage: completion,
              amountPaid: Math.random() > 0.7 ? Math.floor(Math.random() * 200) + 50 : 0,
              deviceType: ['mobile', 'desktop', 'tablet', 'smarttv'][Math.floor(Math.random() * 4)],
              status: completion > 90 ? 'completed' : completion > 20 ? 'in_progress' : 'started',
              viewedAt: new Date(Date.now() - Math.random() * days * 24 * 60 * 60 * 1000)
            });
          }
        }
        
        await Analytics.insertMany(sampleAnalytics);
        console.log('✅ Generated', sampleAnalytics.length, 'sample analytics records');
        
        // Re-fetch the data
        return res.json({
          success: true,
          dateRange: `Last ${days} days (SAMPLE DATA)`,
          platformStats: {
            totalViews: sampleAnalytics.length,
            totalRevenue: sampleAnalytics.reduce((sum, a) => sum + (a.amountPaid || 0), 0),
            avgCompletion: Math.round(sampleAnalytics.reduce((sum, a) => sum + (a.completionPercentage || 0), 0) / sampleAnalytics.length),
            activeUsers: users.length,
            totalContent: allContent.length
          },
          contentMetrics: allContent.map(content => {
            const contentData = sampleAnalytics.filter(a => a.contentId.toString() === content._id.toString());
            return {
              contentId: content._id,
              title: content.title,
              category: content.category,
              views: contentData.length,
              revenue: contentData.reduce((sum, a) => sum + (a.amountPaid || 0), 0),
              avgWatchTime: contentData.length > 0 ? Math.round(contentData.reduce((sum, a) => sum + (a.watchTimeSeconds || 0), 0) / contentData.length / 60) : 0,
              completion: contentData.length > 0 ? Math.round(contentData.reduce((sum, a) => sum + (a.completionPercentage || 0), 0) / contentData.length) : 0,
              rating: 4.5
            };
          }).filter(item => item.views > 0).sort((a, b) => b.views - a.views)
        });
      }
    }

    // Group analytics by content
    const contentAnalytics = {};
    allContent.forEach(content => {
      contentAnalytics[content._id] = {
        title: content.title,
        category: content.category,
        data: allAnalytics.filter(a => a.contentId.toString() === content._id.toString())
      };
    });

    // Calculate platform-wide metrics
    const totalViews = allAnalytics.length;
    const totalRevenue = allAnalytics.reduce((sum, a) => sum + (a.amountPaid || 0), 0);
    const avgCompletion = allAnalytics.length > 0
      ? Math.round(allAnalytics.reduce((sum, a) => sum + (a.completionPercentage || 0), 0) / allAnalytics.length)
      : 0;

    // Get unique active users
    const uniqueUsers = new Set(allAnalytics.map(a => a.userId.toString())).size;

    // Build response with per-content analytics
    const contentMetrics = Object.entries(contentAnalytics).map(([contentId, content]) => {
      const data = content.data;
      return {
        contentId,
        title: content.title,
        category: content.category,
        views: data.length,
        revenue: data.reduce((sum, a) => sum + (a.amountPaid || 0), 0),
        avgWatchTime: data.length > 0 ? Math.round(data.reduce((sum, a) => sum + (a.watchTimeSeconds || 0), 0) / data.length / 60) : 0,
        completion: data.length > 0 ? Math.round(data.reduce((sum, a) => sum + (a.completionPercentage || 0), 0) / data.length) : 0,
        rating: 4.5 // Can be calculated from a separate ratings collection if available
      };
    }).filter(item => item.views > 0); // Only show content with views

    res.json({
      success: true,
      dateRange: `Last ${days} days`,
      platformStats: {
        totalViews,
        totalRevenue,
        avgCompletion,
        activeUsers: uniqueUsers,
        totalContent: allContent.length
      },
      contentMetrics: contentMetrics.sort((a, b) => b.views - a.views)
    });
  } catch (error) {
    console.error('❌ Admin analytics fetch error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
