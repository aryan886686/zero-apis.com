const jwt = require('jsonwebtoken');
const config = require('../config/env');
const Admin = require('../models/Admin');
const logger = require('../utils/logger');
const { isValidEmail } = require('../utils/validators');

/**
 * Login admin user
 * POST /api/auth/login
 */
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, error: 'Email and password are required.' });
    }

    if (!isValidEmail(email)) {
      return res.status(400).json({ success: false, error: 'Invalid email format.' });
    }

    const admin = await Admin.findOne({ email: email.toLowerCase() }).select('+passwordHash');
    if (!admin) {
      return res.status(401).json({ success: false, error: 'Invalid credentials.' });
    }

    if (admin.status !== 'active') {
      return res.status(403).json({ success: false, error: 'Account is suspended. Contact super admin.' });
    }

    const isMatch = await admin.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ success: false, error: 'Invalid credentials.' });
    }

    admin.lastLoginAt = new Date();
    // Save without triggering password hash (passwordHash not modified)
    await admin.save();

    const token = jwt.sign(
      { id: admin._id, email: admin.email, role: admin.role },
      config.jwtSecret,
      { expiresIn: config.jwtExpiresIn }
    );

    logger.info(`Admin logged in: ${admin.email}`);

    res.json({
      success: true,
      data: {
        token,
        admin: {
          id: admin._id,
          email: admin.email,
          role: admin.role,
          lastLoginAt: admin.lastLoginAt,
        },
      },
    });
  } catch (error) {
    logger.error(`Login error: ${error.message}`);
    res.status(500).json({ success: false, error: 'Login failed. Please try again.' });
  }
};

/**
 * Get current admin profile
 * GET /api/auth/me
 */
const getMe = async (req, res) => {
  try {
    const admin = await Admin.findById(req.admin._id).select('-passwordHash');
    res.json({ success: true, data: admin });
  } catch (error) {
    logger.error(`Get profile error: ${error.message}`);
    res.status(500).json({ success: false, error: 'Failed to fetch profile.' });
  }
};

/**
 * Change OWN password (requires current password verification)
 * PUT /api/auth/password
 */
const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ success: false, error: 'Current and new password are required.' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ success: false, error: 'New password must be at least 6 characters.' });
    }

    // Must fetch with passwordHash for comparison
    const admin = await Admin.findById(req.admin._id).select('+passwordHash');
    if (!admin) {
      return res.status(404).json({ success: false, error: 'Admin not found.' });
    }

    const isMatch = await admin.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(401).json({ success: false, error: 'Current password is incorrect.' });
    }

    // Setting passwordHash triggers the pre-save hook to re-hash
    admin.passwordHash = newPassword;
    await admin.save();

    logger.info(`Password changed for: ${admin.email}`);
    res.json({ success: true, message: 'Password changed successfully.' });
  } catch (error) {
    logger.error(`Change password error: ${error.message}`);
    res.status(500).json({ success: false, error: `Failed to change password: ${error.message}` });
  }
};

module.exports = { login, getMe, changePassword };
