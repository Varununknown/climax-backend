const express = require('express');
const router = express.Router();
const Settings = require('../models/Settings.cjs');
const { verifyToken } = require('./authRoutes.cjs');

// Get all settings
router.get('/', async (req, res) => {
  try {
    const settings = await Settings.find();
    const settingsMap = {};
    
    // Build settings map from database
    settings.forEach(s => {
      settingsMap[s.settingKey] = s.settingValue;
    });
    
    // Ensure default settings exist
    if (!settingsMap.exploreEnabled) {
      settingsMap.exploreEnabled = true;
    }
    
    res.json(settingsMap);
  } catch (error) {
    console.error('❌ Error fetching settings:', error);
    // Return default settings on error
    res.json({ exploreEnabled: true });
  }
});

// Get specific setting
router.get('/:key', async (req, res) => {
  try {
    const setting = await Settings.findOne({ settingKey: req.params.key });
    if (!setting) {
      return res.status(404).json({ error: 'Setting not found' });
    }
    res.json({ [req.params.key]: setting.settingValue });
  } catch (error) {
    console.error('Error fetching setting:', error);
    res.status(500).json({ error: 'Failed to fetch setting' });
  }
});

// Update setting (admin only)
router.post('/:key', async (req, res) => {
  try {
    const { settingValue } = req.body;

    if (settingValue === undefined) {
      return res.status(400).json({ error: 'settingValue is required' });
    }

    let setting = await Settings.findOne({ settingKey: req.params.key });
    
    if (!setting) {
      setting = new Settings({
        settingKey: req.params.key,
        settingValue: settingValue,
        description: ''
      });
    } else {
      setting.settingValue = settingValue;
    }

    await setting.save();
    res.json({ 
      success: true, 
      message: `Setting ${req.params.key} updated successfully`,
      [req.params.key]: settingValue 
    });
  } catch (error) {
    console.error('Error updating setting:', error);
    res.status(500).json({ error: 'Failed to update setting' });
  }
});

module.exports = router;
