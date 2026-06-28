const jwt = require('jsonwebtoken');
const User = require('../models/User');

module.exports = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  if (!authHeader) return res.status(401).json({ message: 'No token provided' });

  const token = authHeader.split(' ')[1]; // Bearer <token>
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET || 'defaultsecret');
  
    const user = await User.findById(payload.id);
    if (!user) return res.status(401).json({ message: 'User not found' });
    req.user = user; // attach full user object
    next();
  } catch (err) {
    return res.status(403).json({ message: 'Invalid token' });
  }
};
