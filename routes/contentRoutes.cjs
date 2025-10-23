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

module.exports = router;
