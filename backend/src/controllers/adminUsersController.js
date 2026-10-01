const Admin = require('../models/Admin');
const logger = require('../utils/logger');
const { isValidEmail } = require('../utils/validators');

/**
 * List all admins/moderators (Super Admin only)
 * GET /admin/users
 */
const listUsers = async (req, res) => {
  try {
    const users = await Admin.find().select('-passwordHash').sort({ createdAt: -1 });
    res.json({ success: true, data: users });
  } catch (error) {
    logger.error(`List users error: ${error.message}`);
    res.status(500).json({ success: false, error: 'Failed to fetch users.' });
  }
};

/**
 * Create a new moderator (Super Admin only)
 * POST /admin/users
 */
const createUser = async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, error: 'Email and password are required.' });
    }

    if (!isValidEmail(email)) {
      return res.status(400).json({ success: false, error: 'Invalid email format.' });
    }

    if (password.length < 6) {
      return res.status(400).json({ success: false, error: 'Password must be at least 6 characters.' });
    }

    // Only allow creating moderators — prevent creating another super_admin via UI
    const assignedRole = role === 'super_admin' ? 'super_admin' : 'moderator';

    const existing = await Admin.findOne({ email: email.toLowerCase() });
    if (existing) {
      return res.status(409).json({ success: false, error: 'An account with this email already exists.' });
    }

    const user = new Admin({
      name: name || '',
      email: email.toLowerCase(),
      passwordHash: password, // pre-save hook will hash it
      role: assignedRole,
      status: 'active',
    });

    await user.save();
    logger.info(`New ${assignedRole} created: ${email} by ${req.admin.email}`);

    const safeUser = user.toJSON();
    res.status(201).json({ success: true, data: safeUser });
  } catch (error) {
    logger.error(`Create user error: ${error.message}`);
    if (error.code === 11000) {
      return res.status(409).json({ success: false, error: 'Email already exists.' });
    }
    res.status(500).json({ success: false, error: `Failed to create user: ${error.message}` });
  }
};

/**
 * Update user status — suspend or activate (Super Admin only)
 * PATCH /admin/users/:id/status
 */
const updateUserStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['active', 'suspended'].includes(status)) {
      return res.status(400).json({ success: false, error: 'Invalid status. Use active or suspended.' });
    }

    // Cannot suspend yourself
    if (id === req.admin._id.toString()) {
      return res.status(400).json({ success: false, error: 'Cannot change your own account status.' });
    }

    const user = await Admin.findByIdAndUpdate(id, { status }, { new: true }).select('-passwordHash');
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found.' });
    }

    logger.info(`User ${user.email} status changed to ${status} by ${req.admin.email}`);
    res.json({ success: true, data: user, message: `Account ${status} successfully.` });
  } catch (error) {
    logger.error(`Update user status error: ${error.message}`);
    res.status(500).json({ success: false, error: 'Failed to update user status.' });
  }
};

/**
 * Force-change any user's password (Super Admin only)
 * PATCH /admin/users/:id/password
 */
const forceChangePassword = async (req, res) => {
  try {
    const { id } = req.params;
    const { newPassword } = req.body;

    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ success: false, error: 'New password must be at least 6 characters.' });
    }

    const user = await Admin.findById(id).select('+passwordHash');
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found.' });
    }

    user.passwordHash = newPassword; // pre-save hook will hash it
    await user.save();

    logger.info(`Password force-changed for ${user.email} by ${req.admin.email}`);
    res.json({ success: true, message: `Password updated for ${user.email}.` });
  } catch (error) {
    logger.error(`Force change password error: ${error.message}`);
    res.status(500).json({ success: false, error: `Failed to change password: ${error.message}` });
  }
};

/**
 * Delete a user (Super Admin only, cannot delete self)
 * DELETE /admin/users/:id
 */
const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    if (id === req.admin._id.toString()) {
      return res.status(400).json({ success: false, error: 'Cannot delete your own account.' });
    }

    const user = await Admin.findByIdAndDelete(id);
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found.' });
    }

    logger.info(`User ${user.email} deleted by ${req.admin.email}`);
    res.json({ success: true, message: 'User deleted successfully.' });
  } catch (error) {
    logger.error(`Delete user error: ${error.message}`);
    res.status(500).json({ success: false, error: 'Failed to delete user.' });
  }
};

/**
 * Update user name/email (Super Admin only)
 * PATCH /admin/users/:id
 */
const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email } = req.body;

    const update = {};
    if (name !== undefined) update.name = name;
    if (email) {
      if (!isValidEmail(email)) {
        return res.status(400).json({ success: false, error: 'Invalid email format.' });
      }
      update.email = email.toLowerCase();
    }

    const user = await Admin.findByIdAndUpdate(id, update, { new: true, runValidators: true }).select('-passwordHash');
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found.' });
    }

    res.json({ success: true, data: user, message: 'User updated successfully.' });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ success: false, error: 'Email already in use.' });
    }
    res.status(500).json({ success: false, error: `Failed to update user: ${error.message}` });
  }
};

module.exports = { listUsers, createUser, updateUserStatus, forceChangePassword, deleteUser, updateUser };
