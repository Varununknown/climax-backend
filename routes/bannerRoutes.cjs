const express = require('express');
const router = express.Router();
const Banner = require('../models/Banner.cjs');

// GET all active banners
router.get('/', async (req, res) => {
  try {
    const banners = await Banner.find({ isActive: true }).sort({ position: 1 });
    res.json(banners);
  } catch (error) {
    console.error('❌ Error fetching banners:', error);
    res.status(500).json({ message: 'Failed to fetch banners', error: error.message });
  }
});

// GET banner by category
router.get('/category/:category', async (req, res) => {
  try {
    const { category } = req.params;
    const banners = await Banner.find({ 
      category: category,
      isActive: true 
    }).sort({ position: 1 });
    res.json(banners);
  } catch (error) {
    console.error('❌ Error fetching banners by category:', error);
    res.status(500).json({ message: 'Failed to fetch banners', error: error.message });
  }
});

// POST new banner (ADMIN)
router.post('/', async (req, res) => {
  try {
    const { title, description, imageUrl, category, position, link } = req.body;

    // Validation
    if (!title || !title.trim()) {
      return res.status(400).json({ error: 'Title is required' });
    }
    if (!imageUrl || !imageUrl.trim()) {
      return res.status(400).json({ error: 'Image URL is required' });
    }
    if (!category || !category.trim()) {
      return res.status(400).json({ error: 'Category is required' });
    }

    const newBanner = new Banner({
      title: title.trim(),
      description: description || '',
      imageUrl: imageUrl.trim(),
      category: category.trim(),
      position: position || 1,
      link: link || '',
      isActive: true
    });

    const savedBanner = await newBanner.save();
    res.status(201).json({ 
      message: '✅ Banner created successfully',
      banner: savedBanner 
    });
  } catch (error) {
    console.error('❌ Error creating banner:', error);
    res.status(500).json({ message: 'Failed to create banner', error: error.message });
  }
});

// PUT update banner (ADMIN)
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, imageUrl, category, position, isActive, link } = req.body;

    const banner = await Banner.findByIdAndUpdate(
      id,
      {
        title: title || undefined,
        description: description !== undefined ? description : undefined,
        imageUrl: imageUrl || undefined,
        category: category || undefined,
        position: position || undefined,
        isActive: isActive !== undefined ? isActive : undefined,
        link: link !== undefined ? link : undefined,
        updatedAt: new Date()
      },
      { new: true, runValidators: true }
    );

    if (!banner) {
      return res.status(404).json({ error: 'Banner not found' });
    }

    res.json({ 
      message: '✅ Banner updated successfully',
      banner 
    });
  } catch (error) {
    console.error('❌ Error updating banner:', error);
    res.status(500).json({ message: 'Failed to update banner', error: error.message });
  }
});

// DELETE banner (ADMIN)
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const banner = await Banner.findByIdAndDelete(id);

    if (!banner) {
      return res.status(404).json({ error: 'Banner not found' });
    }

    res.json({ 
      message: '✅ Banner deleted successfully',
      banner 
    });
  } catch (error) {
    console.error('❌ Error deleting banner:', error);
    res.status(500).json({ message: 'Failed to delete banner', error: error.message });
  }
});

module.exports = router;
