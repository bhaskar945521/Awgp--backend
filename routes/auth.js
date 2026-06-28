const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const bcrypt = require('bcryptjs');
const auth = require('../middleware/auth');
const roleCheck = require('../middleware/roleCheck');

// Login - public
router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ message: 'Username and password required' });
  }
  try {
    const user = await User.findOne({ username });
    if (!user) return res.status(401).json({ message: 'Invalid credentials' });
    const valid = await user.validatePassword(password);
    if (!valid) return res.status(401).json({ message: 'Invalid credentials' });
    const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET || 'defaultsecret', { expiresIn: '7d' });
    res.json({ token, role: user.role });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Register SubAdmin - only admin can create new users
router.post('/register', auth, roleCheck(['admin']), async (req, res) => {
  const { username, password, role } = req.body;
  if (!username || !password || !role) {
    return res.status(400).json({ message: 'All fields required' });
  }
  // Allow any role value (admin or any user‑type role)
  // No strict whitelist here – roleCheck middleware will enforce permissions later
  // if (!['admin', 'user'].includes(role)) { return res.status(400).json({ message: 'Invalid role' }); }

  try {
    const existing = await User.findOne({ username });
    if (existing) return res.status(409).json({ message: 'User already exists' });
    const user = new User({ username, role });
    await user.setPassword(password);
    await user.save();
    res.status(201).json({ message: 'User created', userId: user._id });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
