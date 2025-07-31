const express = require('express');
const router = express.Router();
const Content = require('../models/Content.cjs');

// GET all contents
router.get('/', async (req, res) => {
  try {
    const contents = await Content.find().sort({ createdAt: -1 });
    res.json(contents);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ✅ GET content by ID (this was missing!)
router.get('/:id', async (req, res) => {
  try {
    const content = await Content.findById(req.params.id);
    if (!content) {
      return res.status(404).json({ message: 'Content not found' });
    }
    res.json(content);
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
      videoUrl
    } = req.body;

    if (
      !title || !description || !genre || !duration || !type || !rating ||
      !category || climaxTimestamp === undefined || !thumbnail || !videoUrl
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
      videoUrl
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
