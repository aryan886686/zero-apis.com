const express = require('express');
const router = express.Router();
const { login, getMe, changePassword } = require('../controllers/authController');
const { authMiddleware } = require('../middleware/auth');

// Public routes
router.post('/login', login);

// Protected routes
router.get('/me', authMiddleware, getMe);
router.put('/password', authMiddleware, changePassword);

module.exports = router;
