const mongoose = require('mongoose');

const albumSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },
  title: {
    type: String,
    required: true,
    trim: true,
  },
  description: {
    type: String,
    default: '',
  },
  coverImage: {
    // URL or path to the cover image. Optional – frontend will use a placeholder if missing.
    type: String,
    default: '/album_placeholder.png',
  },
  categoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true },
  audioIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Audio' }],
}, { timestamps: true });

module.exports = mongoose.model('Album', albumSchema);
