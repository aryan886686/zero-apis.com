const express = require('express');
const router = express.Router();
const { authMiddleware, isSuperAdmin } = require('../middleware/auth');
const {
  listApis, getApi, createApi, updateApi, deleteApi, cloneApi, updateApiStatus,
  listKeys, getKey, createKey, updateKeyStatus, deleteKey, getKeyUsage,
} = require('../controllers/adminController');
const {
  listUsers, createUser, updateUserStatus, forceChangePassword, deleteUser, updateUser,
} = require('../controllers/adminUsersController');
const { getSettings, updateSettings } = require('../controllers/settingsController');

// All admin routes require authentication
router.use(authMiddleware);

// ── API Management ────────────────────────────────────────────────────────────
router.get('/apis', listApis);
router.post('/apis', createApi);
router.get('/apis/:id', getApi);
router.put('/apis/:id', updateApi);
router.delete('/apis/:id', deleteApi);
router.post('/apis/:id/clone', cloneApi);
router.patch('/apis/:id/status', updateApiStatus);

// ── Key Management ────────────────────────────────────────────────────────────
router.get('/keys', listKeys);
router.post('/keys', createKey);
router.get('/keys/:id', getKey);
router.patch('/keys/:id/status', updateKeyStatus);
router.delete('/keys/:id', deleteKey);
router.get('/keys/:id/usage', getKeyUsage);

// ── Settings (Super Admin only for write, all admins can read) ────────────────
router.get('/settings', getSettings);
router.put('/settings', isSuperAdmin, updateSettings);

// ── Team / User Management (Super Admin only) ─────────────────────────────────
router.get('/users', isSuperAdmin, listUsers);
router.post('/users', isSuperAdmin, createUser);
router.patch('/users/:id', isSuperAdmin, updateUser);
router.patch('/users/:id/status', isSuperAdmin, updateUserStatus);
router.patch('/users/:id/password', isSuperAdmin, forceChangePassword);
router.delete('/users/:id', isSuperAdmin, deleteUser);

module.exports = router;
