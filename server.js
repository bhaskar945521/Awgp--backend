const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const mongoose = require('mongoose');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Ensure uploads folder exists
if (!fs.existsSync(path.join(__dirname, 'uploads'))) {
  fs.mkdirSync(path.join(__dirname, 'uploads'));
}

// Routes
const authRoutes = require('./routes/auth');
const categoryRoutes = require('./routes/categories');
const audioRoutes = require('./routes/audios');
const settingsRoutes = require('./routes/settings');
const albumRoutes = require('./routes/albums');
const userRoutes = require('./routes/users');
const galleryRoutes = require('./routes/gallery');
const searchRoutes = require('./routes/search');

app.use('/api/search', searchRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/audios', audioRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/albums', albumRoutes);
app.use('/api/users', userRoutes);
app.use('/api/gallery', galleryRoutes);



// Database Connection & default admin seed
const User = require('./models/User');
mongoose.connect(process.env.MONGODB_URI)
  .then(async () => {
    console.log('Connected to MongoDB');
    const adminExists = await User.findOne({ username: 'shantikunjadmin' });
    if (!adminExists) {
      const admin = new User({ username: 'shantikunjadmin', role: 'admin' });
      await admin.setPassword('Shantikunj2026');
      await admin.save();
      console.log('Default admin user created');
    }
  })
  .catch(err => console.error('MongoDB Connection Error:', err.message));

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
