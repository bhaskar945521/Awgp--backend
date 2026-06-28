const express = require('express');
const router = express.Router();
const User = require('../models/User');
const auth = require('../middleware/auth');
const roleCheck = require('../middleware/roleCheck');
const bcrypt = require('bcryptjs');

// GET all users (admin only) – omit passwordHash
router.get('/', auth, roleCheck(['admin']), async (req, res) => {
  try {
    const users = await User.find().select('-passwordHash');
    res.json(users);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// CREATE new user (admin only)
router.post('/', auth, roleCheck(['admin']), async (req, res) => {
  const { username, password, role } = req.body;
  if (!username || !password) return res.status(400).json({ message: 'Username and password required' });
  try {
    const existing = await User.findOne({ username });
    if (existing) return res.status(400).json({ message: 'Username already exists' });
    const user = new User({ username, role: role || 'user' });
    const salt = await bcrypt.genSalt(10);
    user.passwordHash = await bcrypt.hash(password, salt);
    await user.save();
    const userObj = user.toObject();
    delete userObj.passwordHash;
    res.status(201).json(userObj);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// UPDATE user (admin only) – allow role change and password reset
router.put('/:id', auth, roleCheck(['admin']), async (req, res) => {
  const { role, password } = req.body;
  const update = {};
  if (role) update.role = role;
  if (password) {
    const salt = await bcrypt.genSalt(10);
    update.passwordHash = await bcrypt.hash(password, salt);
  }
  try {
    const updated = await User.findByIdAndUpdate(req.params.id, update, { new: true }).select('-passwordHash');
    if (!updated) return res.status(404).json({ message: 'User not found' });
    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// DELETE user (admin only)
router.delete('/:id', auth, roleCheck(['admin']), async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json({ message: 'User deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
