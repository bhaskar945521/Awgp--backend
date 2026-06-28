// backend/routes/gallery.js
const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const auth = require('../middleware/auth');
const roleCheck = require('../middleware/roleCheck');

// Multer Storage Configuration inside router
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const imgDir = './uploads/images/';
    if (!fs.existsSync(imgDir)) {
      fs.mkdirSync(imgDir, { recursive: true });
    }
    cb(null, imgDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});
const upload = multer({ storage: storage });

// GET /api/gallery – returns list of images stored in uploads/images
router.get('/', (req, res) => {
  const imagesDir = path.join(__dirname, '..', 'uploads', 'images');
  if (!fs.existsSync(imagesDir)) {
    return res.json([]);
  }
  fs.readdir(imagesDir, (err, files) => {
    if (err) {
      console.error('Failed to read gallery images', err);
      return res.status(500).json({ message: 'Failed to load gallery' });
    }
    const images = files.filter(f => !f.startsWith('.')).map(f => ({
      _id: f,
      url: `/uploads/images/${f}`,
      title: f
    }));
    res.json(images);
  });
});

// POST /api/gallery/upload – upload new images (admin or user allowed)
router.post('/upload', auth, roleCheck(['admin', 'user']), upload.array('images'), (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: 'No images uploaded' });
    }
    const uploadedImages = req.files.map(file => ({
      url: `/uploads/images/${file.filename}`
    }));
    res.status(201).json(uploadedImages);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
