const express = require('express');
const router = express.Router();
const Settings = require('../models/Settings');
const auth = require('../middleware/auth');
const roleCheck = require('../middleware/roleCheck');

// GET site settings (public)
router.get('/', async (req, res) => {
  try {
    const settings = await Settings.findOne();
    res.json(settings || {});
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// UPDATE settings (admin only)
router.put('/', auth, roleCheck(['admin']), async (req, res) => {
  try {
    const updates = req.body;
    const settings = await Settings.findOneAndUpdate({}, updates, { new: true, upsert: true });
    res.json(settings);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

module.exports = router;
