const express = require('express');
const router = express.Router();
const Album = require('../models/Album');
const Audio = require('../models/Audio');
const auth = require('../middleware/auth');
const roleCheck = require('../middleware/roleCheck');

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

  // GET all albums (public)
  router.get('/', async (req, res) => {
    try {
      const albums = await Album.find().populate('categoryId').sort({ createdAt: -1 });
      res.json(albums);
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: 'Server error' });
    }
  });

  // GET single album by ID (public)
  router.get('/:id', async (req, res) => {
    try {
      const album = await Album.findById(req.params.id).populate('categoryId');
      if (!album) return res.status(404).json({ message: 'Album not found' });
      res.json(album);
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: 'Server error' });
    }
  });

  // CREATE new album
  router.post('/', auth, roleCheck(['admin','user','onlyuser']), async (req, res) => {
    try {
      const { name, title, description, coverImage, categoryId, audioIds } = req.body;
    const newAlbum = new Album({ name, title, description, coverImage, categoryId, audioIds });
      await newAlbum.save();
      res.status(201).json(newAlbum);
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: 'Server error' });
    }
  });

  // UPDATE album
  router.put('/:id', auth, roleCheck(['admin','user','onlyuser']), async (req, res) => {
    try {
      const { name, title, description, coverImage, categoryId, audioIds } = req.body;
    const album = await Album.findById(req.params.id);
    if (!album) return res.status(404).json({ message: 'Album not found' });
    if (name !== undefined) album.name = name;
    if (title !== undefined) album.title = title;
    if (description !== undefined) album.description = description;
    if (coverImage !== undefined) album.coverImage = coverImage;
    if (categoryId !== undefined) album.categoryId = categoryId;
    if (audioIds !== undefined) album.audioIds = audioIds;
    await album.save();
      res.json(album);
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: 'Server error' });
    }
  });

// DELETE album
router.delete('/:id', auth, roleCheck(['admin','user','onlyuser']), async (req, res) => {
  try {
    const album = await Album.findByIdAndDelete(req.params.id);
    if (!album) return res.status(404).json({ message: 'Album not found' });

    // Clean up references in Audio (remove this album from audio albumIds)
    await Audio.updateMany(
      { albumIds: req.params.id },
      { $pull: { albumIds: req.params.id } }
    );

    res.json({ message: 'Album deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});
// New endpoint: Create Album from selected Audios (existing)
router.post('/from-selection', auth, roleCheck(['admin','user','onlyuser']), async (req, res) => {
  try {
    const { albumName, title, description, coverImage, categoryId, audioIds } = req.body;
    if (!albumName || !categoryId) {
      return res.status(400).json({ error: 'albumName and categoryId are required' });
    }
    const Category = require('../models/Category');
    const cat = await Category.findById(categoryId);
    if (!cat) return res.status(400).json({ error: 'Invalid categoryId' });
    let validAudioIds = [];
    if (audioIds && audioIds.length) {
      const audios = await Audio.find({ _id: { $in: audioIds } });
      if (audios.length !== audioIds.length) {
        return res.status(400).json({ error: 'One or more audioIds are invalid' });
      }
      validAudioIds = audioIds;
    }
    const newAlbum = new Album({
      name: albumName,
      title: title || albumName,
      description: description || '',
      coverImage: coverImage || '/album_placeholder.png',
      categoryId,
      audioIds: validAudioIds
    });
    await newAlbum.save();
    if (validAudioIds.length) {
      await Audio.updateMany({ _id: { $in: validAudioIds } }, { $addToSet: { albumIds: newAlbum._id } });
    }
    await Album.updateMany({ _id: { $ne: newAlbum._id }, audioIds: { $in: validAudioIds } }, { $pull: { audioIds: { $in: validAudioIds } } });
    res.status(201).json(newAlbum);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// New endpoint: Create Album from selected Audios with optional audio edits
router.post('/from-selection-with-edits', auth, roleCheck(['admin','user','onlyuser']), async (req, res) => {
  try {
    const { albumName, title, description, coverImage, categoryId, audioIds, audioUpdates } = req.body;
    if (!albumName || !categoryId) {
      return res.status(400).json({ error: 'albumName and categoryId are required' });
    }
    const Category = require('../models/Category');
    const cat = await Category.findById(categoryId);
    if (!cat) return res.status(400).json({ error: 'Invalid categoryId' });
    let validAudioIds = [];
    if (audioIds && audioIds.length) {
      const audios = await Audio.find({ _id: { $in: audioIds } });
      if (audios.length !== audioIds.length) {
        return res.status(400).json({ error: 'One or more audioIds are invalid' });
      }
      validAudioIds = audioIds;
    }
    // Apply optional audio edits
    const updatedAudios = [];
    if (Array.isArray(audioUpdates) && audioUpdates.length) {
      for (const upd of audioUpdates) {
        const { audioId, title, speaker, description, tags } = upd;
        const audio = await Audio.findById(audioId);
        if (!audio) continue;
        if (title !== undefined) audio.title = title;
        if (speaker !== undefined) audio.speaker = speaker;
        if (description !== undefined) audio.description = description;
        if (Array.isArray(tags)) audio.tags = tags;
        await audio.save();
        updatedAudios.push(audio);
      }
    }
    const newAlbum = new Album({
      name: albumName,
      title: title || albumName,
      description: description || '',
      coverImage: coverImage || '/album_placeholder.png',
      categoryId,
      audioIds: validAudioIds
    });
    await newAlbum.save();
    if (validAudioIds.length) {
      await Audio.updateMany({ _id: { $in: validAudioIds } }, { $addToSet: { albumIds: newAlbum._id } });
    }
    await Album.updateMany({ _id: { $ne: newAlbum._id }, audioIds: { $in: validAudioIds } }, { $pull: { audioIds: { $in: validAudioIds } } });
    res.status(201).json({ album: newAlbum, updatedAudios });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});
module.exports = router;
