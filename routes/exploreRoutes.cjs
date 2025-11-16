const express = require('express');
const router = express.Router();
const ExploreItem = require('../models/ExploreItem.cjs');

// GET all explore items
router.get('/', async (req, res) => {
  try {
    const items = await ExploreItem.find({ isActive: true }).sort({ position: 1 });
    res.json(items);
  } catch (error) {
    console.error('Error fetching explore items:', error);
    res.status(500).json({ message: 'Failed to fetch explore items', error: error.message });
  }
});

// GET explore item by ID
router.get('/:id', async (req, res) => {
  try {
    const item = await ExploreItem.findById(req.params.id);
    if (!item) return res.status(404).json({ message: 'Explore item not found' });
    res.json(item);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching explore item', error: error.message });
  }
});

// CREATE explore item
router.post('/', async (req, res) => {
  try {
    const { title, description, imageUrl, position, link } = req.body;

    if (!title || !imageUrl) {
      return res.status(400).json({ message: 'Title and image URL are required' });
    }

    const newItem = new ExploreItem({
      title,
      description,
      imageUrl,
      position,
      link,
      isActive: true
    });

    await newItem.save();
    res.status(201).json(newItem);
  } catch (error) {
    console.error('Error creating explore item:', error);
    res.status(500).json({ message: 'Failed to create explore item', error: error.message });
  }
});

// UPDATE explore item
router.put('/:id', async (req, res) => {
  try {
    const { title, description, imageUrl, position, isActive, link } = req.body;

    const item = await ExploreItem.findByIdAndUpdate(
      req.params.id,
      { title, description, imageUrl, position, isActive, link },
      { new: true, runValidators: true }
    );

    if (!item) return res.status(404).json({ message: 'Explore item not found' });
    res.json(item);
  } catch (error) {
    console.error('Error updating explore item:', error);
    res.status(500).json({ message: 'Failed to update explore item', error: error.message });
  }
});

// DELETE explore item
router.delete('/:id', async (req, res) => {
  try {
    const item = await ExploreItem.findByIdAndDelete(req.params.id);
    if (!item) return res.status(404).json({ message: 'Explore item not found' });
    res.json({ message: 'Explore item deleted successfully', item });
  } catch (error) {
    console.error('Error deleting explore item:', error);
    res.status(500).json({ message: 'Failed to delete explore item', error: error.message });
  }
});

module.exports = router;
