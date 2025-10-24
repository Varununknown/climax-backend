const express = require('express');
const router = express.Router();
const Content = require('../models/Content.cjs');
const { optimizeVideoUrl, generateAdaptiveUrls, prewarmCDNCache } = require('../utils/cdnHelper.cjs');

// GET all contents with CDN optimization
router.get('/', async (req, res) => {
  try {
    const contents = await Content.find().sort({ createdAt: -1 });
    
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
    const content = await Content.findById(req.params.id);
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

    if (
      !title || !description || !genre || !duration || !type || !rating ||
      !category || climaxTimestamp === undefined || !thumbnail
    ) {
      return res.status(400).json({ error: 'Missing required fields in body' });
    }

    const parsedClimax = Number(climaxTimestamp);
    if (isNaN(parsedClimax)) {
      return res.status(400).json({ error: 'climaxTimestamp must be a number (in seconds)' });
    }

    const newContent = new Content({
      title,
      description,
      genre: typeof genre === 'string' ? genre.split(',').map(g => g.trim()) : genre,
      duration: Number(duration),
      type,
      rating: Number(rating),
      premiumPrice: Number(premiumPrice),
      category,
      climaxTimestamp: parsedClimax,
      thumbnail,
      videoUrl,
      language
    });

    await newContent.save();
    res.status(201).json(newContent);
  } catch (err) {
    console.error('❌ Content creation error:', err);
    res.status(500).json({ error: 'Server error while creating content' });
  }
});

// PUT update content by ID
router.put('/:id', async (req, res) => {
  try {
    const updated = await Content.findByIdAndUpdate(req.params.id, req.body, {
      new: true
    });
    res.json(updated);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// DELETE content by ID
router.delete('/:id', async (req, res) => {
  try {
    await Content.findByIdAndDelete(req.params.id);
    res.status(204).end();
  } catch (err) {
    res.status(400).json({ error: err.message });
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
