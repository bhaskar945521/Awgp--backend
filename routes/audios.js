const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const multer = require('multer');
const mongoose = require('mongoose');
const Audio = require('../models/Audio');
const Album = require('../models/Album'); // added for duplicate info
const auth = require('../middleware/auth');
const roleCheck = require('../middleware/roleCheck');

// Multer Storage Configuration inside router
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    if (file.fieldname === 'imageFile') {
      const imgDir = './uploads/images/';
      if (!fs.existsSync(imgDir)) fs.mkdirSync(imgDir, { recursive: true });
      cb(null, imgDir);
    } else {
      cb(null, './uploads/');
    }
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});
const upload = multer({ storage: storage });

// Helper to parse array fields (supports JSON array string, comma-separated string, or array)
function parseArrayField(field) {
  if (!field) return [];
  if (Array.isArray(field)) return field;
  try {
    const parsed = JSON.parse(field);
    if (Array.isArray(parsed)) return parsed;
  } catch (e) {}
  if (typeof field === 'string') {
    return field.split(',').map(s => s.trim()).filter(Boolean);
  }
  return [field];
}

// Middleware to reject any legacy category fields
function rejectCategoryFields(req, res, next) {
  if (req.body.category || req.body.categoryIds) {
    return res.status(400).json({ message: 'Category fields are not allowed in audio requests.' });
  }
  next();
}

// GET /api/audios – advanced search with pagination & sorting
router.get('/', async (req, res) => {
  try {
    const { page, limit, sort = '-createdAt', album } = req.query;
    const filters = {};
    if (album) {
      // Filter audios that belong to the specified album ID
      filters.albumIds = { $in: [album] };
    }
    const sortObj = {};
    const direction = sort.startsWith('-') ? -1 : 1;
    const field = sort.replace(/^-/, '');
    sortObj[field] = direction;

    if (page || limit) {
      const pageNum = Number(page) || 1;
      const limitNum = Number(limit) || 20;
      const skip = (pageNum - 1) * limitNum;
      const [total, audios] = await Promise.all([
        Audio.countDocuments(filters),
        Audio.find(filters)
          .populate('albumIds')
          .sort(sortObj)
          .skip(skip)
          .limit(limitNum)
      ]);
      res.json({ data: audios, total, page: pageNum, limit: limitNum });
    } else {
      const audios = await Audio.find(filters)
        .populate('albumIds')
        .sort(sortObj);
      res.json(audios);
    }
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/audios/recent/count – fetch recently uploaded audios (within last X hours, default 24)
router.get('/recent/count', async (req, res) => {
  try {
    const hours = Number(req.query.hours) || 24;
    const sinceDate = new Date(Date.now() - hours * 60 * 60 * 1000);
    const items = await Audio.find({ createdAt: { $gte: sinceDate } })
      .populate('albumIds')
      .sort({ createdAt: -1 });
    res.json({ items });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/audios/:id – fetch single audio by ID
router.get('/:id', async (req, res) => {
  try {
    const audio = await Audio.findById(req.params.id).populate('albumIds');
    if (!audio) return res.status(404).json({ message: 'Audio not found' });
    res.json(audio);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/audios – upload new audio (protected)
router.post(
  '/',
  auth,
  roleCheck(['admin', 'user']),
  upload.fields([
    { name: 'audioFile', maxCount: 1 },
    { name: 'imageFile', maxCount: 1 }
  ]),
  rejectCategoryFields,
  async (req, res) => {
    try {
      const { title, speaker, duration, tags, albumIds } = req.body;
      const audioFile = req.files?.audioFile?.[0];
      const imageFile = req.files?.imageFile?.[0];
      if (!audioFile) return res.status(400).json({ message: 'No audio file uploaded.' });

      // Duplicate detection via hash
      const fileData = await fs.promises.readFile(audioFile.path);
      const hash = crypto.createHash('sha256').update(fileData).digest('hex');

            // Duplicate detection via hash
      const existing = await Audio.findOne({ fileHash: hash }).populate('albumIds');
      if (existing) {
        // Clean up uploaded files
        fs.unlinkSync(audioFile.path);
        if (imageFile) fs.unlinkSync(imageFile.path);
        const albumIds = existing.albumIds ? existing.albumIds.map(a => a._id) : [];
        const Album = require('../models/Album');
        const albums = await Album.find({ _id: { $in: albumIds } }).populate('categoryId');
        
        // Deduplicate categories and collect titles
        const categoriesMap = {};
        albums.forEach(al => {
          if (al.categoryId) {
            categoriesMap[al.categoryId._id.toString()] = al.categoryId.name;
          }
        });
        const categories = Object.keys(categoriesMap).map(id => ({ _id: id, name: categoriesMap[id] }));
        const albumDetails = albums.map(al => ({ _id: al._id, title: al.title || al.name }));

        return res.status(409).json({
          message: 'This audio file already exists in the library.',
          existingTitle: existing.title,
          existingId: existing._id,
          albums: albumDetails,
          categories
        });
      }
      const resolvedAlbumIds = parseArrayField(albumIds);
      const resolvedTags = parseArrayField(tags);

      const audioUrl = `/uploads/${audioFile.filename}`;
      let imageUrl = '/placeholder.png';
      if (imageFile) {
        imageUrl = `/uploads/images/${imageFile.filename}`;
      }

      const newAudio = new Audio({
        title,
        speaker,
        description: req.body.description || '',
        duration: duration || '0:00',
        imageUrl,
        albumIds: resolvedAlbumIds,
        tags: resolvedTags,
        audioUrl,
        fileHash: hash,
        fileExtension: path.extname(audioFile.originalname).replace('.', '').toLowerCase() || 'mp3'
      });
      const saved = await newAudio.save();
      res.status(201).json(saved);
    } catch (err) {
      // Cleanup on error
      const audioFile = req.files?.audioFile?.[0];
      const imageFile = req.files?.imageFile?.[0];
      if (audioFile && fs.existsSync(audioFile.path)) fs.unlinkSync(audioFile.path);
      if (imageFile && fs.existsSync(imageFile.path)) fs.unlinkSync(imageFile.path);
      res.status(400).json({ message: err.message });
    }
  }
);

// PUT /api/audios/:id – update audio details (protected, admin only)
router.put('/:id', auth, roleCheck(['admin']), rejectCategoryFields, async (req, res) => {
  try {
    const { title, speaker, duration, description, albumIds, tags } = req.body;
    const audio = await Audio.findById(req.params.id);
    if (!audio) return res.status(404).json({ message: 'Audio not found' });
    if (title) audio.title = title;
    if (speaker !== undefined) audio.speaker = speaker;
    if (duration) audio.duration = duration;
    if (description !== undefined) audio.description = description;
    if (albumIds !== undefined) audio.albumIds = parseArrayField(albumIds);
    if (tags !== undefined) audio.tags = parseArrayField(tags);
    const saved = await audio.save();
    res.json(saved);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// DELETE /api/audios/:id – delete audio track and its file (protected, admin only)
router.delete('/:id', auth, roleCheck(['admin']), async (req, res) => {
  try {
    const audio = await Audio.findById(req.params.id);
    if (!audio) return res.status(404).json({ message: 'Audio not found' });
    if (audio.audioUrl && audio.audioUrl.startsWith('/uploads/')) {
      const filePath = path.join(__dirname, '..', audio.audioUrl);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }
    await Audio.findByIdAndDelete(req.params.id);
    res.json({ message: 'Audio deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Toggle favorite – public endpoint (no auth)
router.patch('/:id/favorite', async (req, res) => {
  try {
    const audio = await Audio.findById(req.params.id);
    if (!audio) return res.status(404).json({ message: 'Audio not found' });
    audio.isFavorite = !audio.isFavorite;
    await audio.save();
    res.json(audio);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
