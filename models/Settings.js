const mongoose = require('mongoose');

const settingsSchema = new mongoose.Schema({
  siteTitle: { type: String, default: 'AWGP Audio Hub' },
  logoUrl: { type: String, default: '/awgp.jpg' },
  footerText: { type: String, default: '© ' + new Date().getFullYear() + ' AWGP Audio Hub' },
  primaryColor: { type: String, default: '#ff7f00' }, // saffron
  secondaryColor: { type: String, default: '#ffd700' }, // gold
}, { timestamps: true });

module.exports = mongoose.model('Settings', settingsSchema);
