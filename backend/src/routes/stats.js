const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');
const {
  getOverview,
  getRequestTrend,
  getTopApis,
  getTopKeys,
  getRecentLogs,
  getResponseTimes,
} = require('../controllers/statsController');

// All stats routes require authentication
router.use(authMiddleware);

router.get('/overview', getOverview);
router.get('/trend', getRequestTrend);
router.get('/top-apis', getTopApis);
router.get('/top-keys', getTopKeys);
router.get('/logs', getRecentLogs);
router.get('/response-times', getResponseTimes);

module.exports = router;
