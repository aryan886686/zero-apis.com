const Settings = require('../models/Settings');
const logger = require('../utils/logger');

/**
 * Get all settings (admin)
 * GET /api/admin/settings
 */
const getSettings = async (req, res) => {
  try {
    const docs = await Settings.find();
    const settings = {};
    for (const doc of docs) {
      settings[doc.key] = doc.value;
    }
    // Provide defaults if keys don't exist yet
    if (!settings.loginPath) settings.loginPath = '/shadowphantomlogin';
    res.json({ success: true, data: settings });
  } catch (error) {
    logger.error(`Get settings error: ${error.message}`);
    res.status(500).json({ success: false, error: 'Failed to fetch settings.' });
  }
};

/**
 * Update a setting (super admin only)
 * PUT /api/admin/settings
 */
const updateSettings = async (req, res) => {
  try {
    const { loginPath } = req.body;

    const updated = {};

    if (loginPath !== undefined) {
      // Sanitize: must start with /, only alphanumeric and hyphens
      let cleanPath = loginPath.trim();
      if (!cleanPath.startsWith('/')) cleanPath = '/' + cleanPath;
      // Only allow safe chars
      if (!/^\/[a-zA-Z0-9_-]+$/.test(cleanPath)) {
        return res.status(400).json({
          success: false,
          error: 'Login path must start with / and contain only letters, numbers, hyphens, underscores.',
        });
      }
      await Settings.setValue('loginPath', cleanPath);
      updated.loginPath = cleanPath;
    }

    logger.info(`Settings updated by ${req.admin.email}: ${JSON.stringify(updated)}`);
    res.json({ success: true, data: updated, message: 'Settings saved successfully.' });
  } catch (error) {
    logger.error(`Update settings error: ${error.message}`);
    res.status(500).json({ success: false, error: 'Failed to update settings.' });
  }
};

/**
 * PUBLIC endpoint: get login path (no auth needed)
 * GET /api/settings/login-path
 */
const getLoginPath = async (req, res) => {
  try {
    const loginPath = await Settings.getValue('loginPath', '/shadowphantomlogin');
    res.json({ success: true, data: { loginPath } });
  } catch (error) {
    res.json({ success: true, data: { loginPath: '/shadowphantomlogin' } });
  }
};

module.exports = { getSettings, updateSettings, getLoginPath };
