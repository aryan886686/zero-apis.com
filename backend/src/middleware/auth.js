const jwt = require('jsonwebtoken');
const config = require('../config/env');
const Admin = require('../models/Admin');
const logger = require('../utils/logger');

/**
 * JWT Authentication Middleware
 * Verifies the Bearer token and attaches admin to request
 */
const authMiddleware = async (req, res, next) => {
  try {
    // Get token from header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'Access denied. No token provided.',
      });
    }

    const token = authHeader.split(' ')[1];

    // Verify token
    const decoded = jwt.verify(token, config.jwtSecret);

    // Find admin
    const admin = await Admin.findById(decoded.id).select('-passwordHash');
    if (!admin) {
      return res.status(401).json({
        success: false,
        error: 'Invalid token. Admin not found.',
      });
    }

    if (admin.status !== 'active') {
      return res.status(403).json({
        success: false,
        error: 'Account is suspended.',
      });
    }

    // Attach admin to request
    req.admin = admin;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        error: 'Invalid token.',
      });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        error: 'Token expired. Please login again.',
      });
    }
    logger.error(`Auth middleware error: ${error.message}`);
    return res.status(500).json({
      success: false,
      error: 'Authentication error.',
    });
  }
};

/**
 * Role-based authorization middleware
 * Usage: authorize('super_admin') or authorize('super_admin', 'moderator')
 */
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.admin) {
      return res.status(401).json({ success: false, error: 'Not authenticated.' });
    }
    if (!roles.includes(req.admin.role)) {
      return res.status(403).json({ success: false, error: 'Insufficient permissions. Super Admin access required.' });
    }
    next();
  };
};

/**
 * Shorthand: Super Admin only
 */
const isSuperAdmin = (req, res, next) => {
  if (!req.admin || req.admin.role !== 'super_admin') {
    return res.status(403).json({ success: false, error: 'Super Admin access required.' });
  }
  next();
};

module.exports = { authMiddleware, authorize, isSuperAdmin };
