const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');

const JWT_SECRET = process.env.JWT_SECRET || 'kalvi-secret-key-change-in-prod';

function getUser() {
  // Use Atlas model if connected, else local JSON db
  if (mongoose.connection.readyState === 1) return require('../models/User');
  return require('../localDb').User;
}

function signToken(userId) {
  return jwt.sign({ id: userId }, JWT_SECRET, { expiresIn: '7d' });
}

async function protect(req, res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) return res.status(401).json({ error: 'Not authenticated' });
  try {
    const decoded = jwt.verify(header.slice(7), JWT_SECRET);
    const User = getUser();
    const found = await User.findById(decoded.id);
    req.user = found;
    if (!req.user) return res.status(401).json({ error: 'User not found' });
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user?.role)) return res.status(403).json({ error: 'Access denied' });
    next();
  };
}

module.exports = { signToken, protect, requireRole, JWT_SECRET, getUser };
