const mongoose = require('mongoose');

const audioSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true
  },
  speaker: {
    type: String,
    default: 'Unknown Speaker'
  },
  description: {
    type: String,
    default: ''
  },

  // New many-to-many relationship fields

  albumIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Album' }],

  date: {
    type: String,
    default: () => new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
  },
  duration: {
    type: String,
    default: "0:00"
  },
  isFavorite: {
    type: Boolean,
    default: false
  },
  audioUrl: {
    type: String,
    required: true
  },
  imageUrl: {
    type: String,
    default: '/placeholder.png'
  },
  fileHash: { // hash for duplicate detection
    type: String,
    index: true
  },
  fileExtension: {
    type: String,
    default: 'mp3'
  },
  originalExtension: {
    type: String,
    default: 'mp3'
  },
  // Optional tags for future search/filtering
  tags: [{ type: String }]
}, { timestamps: true });

module.exports = mongoose.model('Audio', audioSchema);
