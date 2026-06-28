const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const UserSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  passwordHash: { type: String, required: true },
  // Allow flexible role values (admin, user, onlyuser, etc.)
  role: { type: String, enum: ['admin', 'user', 'onlyuser'], default: 'user' },
  // Simple work assignment – can be a free‑form description or list of audio IDs
  assignedWork: { type: String, default: '' }
});

// Helper to set password
UserSchema.methods.setPassword = async function (plainPassword) {
  const salt = await bcrypt.genSalt(10);
  this.passwordHash = await bcrypt.hash(plainPassword, salt);
};

// Helper to validate password
UserSchema.methods.validatePassword = async function (plainPassword) {
  return await bcrypt.compare(plainPassword, this.passwordHash);
};

module.exports = mongoose.model('User', UserSchema);
