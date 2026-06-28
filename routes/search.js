const express = require('express');
const router = express.Router();
const Audio = require('../models/Audio');
const Album = require('../models/Album');
const Category = require('../models/Category');

// GET /api/search?q=term
router.get('/', async (req, res) => {
  const q = req.query.q?.trim();
  if (!q) return res.json({ results: [] });
  const regex = new RegExp(q, 'i');
  try {
    const [audios, albums, categories] = await Promise.all([
      Audio.find({ title: regex }).select('title speaker _id').lean(),
      Album.find({ title: regex }).select('title _id coverImage').lean(),
      Category.find({ name: regex }).select('name _id coverImage').lean()
    ]);
    const results = [];
    audios.forEach(a => results.push({ type: 'audio', id: a._id, title: a.title, speaker: a.speaker }));
    albums.forEach(a => results.push({ type: 'album', id: a._id, title: a.title, coverImage: a.coverImage }));
    categories.forEach(c => results.push({ type: 'category', id: c._id, name: c.name, coverImage: c.coverImage }));
    res.json({ results });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Search failed' });
  }
});

module.exports = router;
