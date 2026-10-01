const Api = require('../models/Api');
const ApiKey = require('../models/ApiKey');
const RequestLog = require('../models/RequestLog');
const Stats = require('../models/Stats');
const logger = require('../utils/logger');

/**
 * Get dashboard overview stats
 * GET /api/admin/stats/overview
 */
const getOverview = async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [totalApis, activeApis, totalKeys, activeKeys, todayRequests, totalRequests] = await Promise.all([
      Api.countDocuments(),
      Api.countDocuments({ status: 'active' }),
      ApiKey.countDocuments(),
      ApiKey.countDocuments({ status: 'active' }),
      RequestLog.countDocuments({ createdAt: { $gte: today } }),
      RequestLog.countDocuments(),
    ]);

    // Today's stats
    const todayStats = await RequestLog.aggregate([
      { $match: { createdAt: { $gte: today } } },
      {
        $group: {
          _id: null,
          totalRequests: { $sum: 1 },
          successfulRequests: {
            $sum: { $cond: [{ $lt: ['$statusCode', 400] }, 1, 0] },
          },
          failedRequests: {
            $sum: { $cond: [{ $gte: ['$statusCode', 400] }, 1, 0] },
          },
          avgResponseTime: { $avg: '$responseTime' },
          totalBandwidth: { $sum: { $add: ['$requestSize', '$responseSize'] } },
        },
      },
    ]);

    // Expiring keys (next 7 days)
    const sevenDaysFromNow = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const expiringKeys = await ApiKey.countDocuments({
      status: 'active',
      expiresAt: { $lte: sevenDaysFromNow, $gt: new Date() },
    });

    res.json({
      success: true,
      data: {
        totalApis,
        activeApis,
        totalKeys,
        activeKeys,
        expiringKeys,
        todayRequests,
        totalRequests,
        todayStats: todayStats[0] || {
          totalRequests: 0,
          successfulRequests: 0,
          failedRequests: 0,
          avgResponseTime: 0,
          totalBandwidth: 0,
        },
      },
    });
  } catch (error) {
    logger.error(`Overview stats error: ${error.message}`);
    res.status(500).json({ success: false, error: 'Failed to fetch overview.' });
  }
};

/**
 * Get request trend (last N days)
 * GET /api/admin/stats/trend?days=7
 */
const getRequestTrend = async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 7;
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const trend = await RequestLog.aggregate([
      { $match: { createdAt: { $gte: startDate } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          total: { $sum: 1 },
          successful: { $sum: { $cond: [{ $lt: ['$statusCode', 400] }, 1, 0] } },
          failed: { $sum: { $cond: [{ $gte: ['$statusCode', 400] }, 1, 0] } },
          avgResponseTime: { $avg: '$responseTime' },
          bandwidth: { $sum: { $add: ['$requestSize', '$responseSize'] } },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    res.json({ success: true, data: trend });
  } catch (error) {
    logger.error(`Request trend error: ${error.message}`);
    res.status(500).json({ success: false, error: 'Failed to fetch trend.' });
  }
};

/**
 * Get top APIs by usage
 * GET /api/admin/stats/top-apis?limit=10
 */
const getTopApis = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const days = parseInt(req.query.days) || 7;
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const topApis = await RequestLog.aggregate([
      { $match: { createdAt: { $gte: startDate } } },
      {
        $group: {
          _id: '$endpoint',
          count: { $sum: 1 },
          avgResponseTime: { $avg: '$responseTime' },
          errorRate: {
            $avg: { $cond: [{ $gte: ['$statusCode', 400] }, 1, 0] },
          },
        },
      },
      { $sort: { count: -1 } },
      { $limit: limit },
    ]);

    res.json({ success: true, data: topApis });
  } catch (error) {
    logger.error(`Top APIs error: ${error.message}`);
    res.status(500).json({ success: false, error: 'Failed to fetch top APIs.' });
  }
};

/**
 * Get top keys by usage
 * GET /api/admin/stats/top-keys?limit=10
 */
const getTopKeys = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const days = parseInt(req.query.days) || 7;
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const topKeys = await RequestLog.aggregate([
      { $match: { createdAt: { $gte: startDate }, keyId: { $ne: null } } },
      {
        $group: {
          _id: '$keyId',
          count: { $sum: 1 },
          avgResponseTime: { $avg: '$responseTime' },
        },
      },
      { $sort: { count: -1 } },
      { $limit: limit },
      {
        $lookup: {
          from: 'apikeys',
          localField: '_id',
          foreignField: '_id',
          as: 'keyInfo',
        },
      },
      { $unwind: { path: '$keyInfo', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          count: 1,
          avgResponseTime: 1,
          name: { $ifNull: ['$keyInfo.metadata.name', 'Unknown'] },
        },
      },
    ]);

    res.json({ success: true, data: topKeys });
  } catch (error) {
    logger.error(`Top keys error: ${error.message}`);
    res.status(500).json({ success: false, error: 'Failed to fetch top keys.' });
  }
};

/**
 * Get recent request logs
 * GET /api/admin/stats/logs?page=1&limit=50
 */
const getRecentLogs = async (req, res) => {
  try {
    const { page = 1, limit = 50, endpoint, statusCode, keyId, startDate, endDate } = req.query;
    const query = {};

    if (endpoint) query.endpoint = endpoint;
    if (statusCode) query.statusCode = parseInt(statusCode);
    if (keyId) query.keyId = keyId;
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    const total = await RequestLog.countDocuments(query);
    const logs = await RequestLog.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .populate('apiId', 'name customEndpoint')
      .populate('keyId', 'metadata.name key');

    res.json({
      success: true,
      data: logs,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    logger.error(`Recent logs error: ${error.message}`);
    res.status(500).json({ success: false, error: 'Failed to fetch logs.' });
  }
};

/**
 * Get response time percentiles
 * GET /api/admin/stats/response-times
 */
const getResponseTimes = async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 7;
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const responseTimes = await RequestLog.aggregate([
      { $match: { createdAt: { $gte: startDate }, responseTime: { $gt: 0 } } },
      { $sort: { responseTime: 1 } },
      {
        $group: {
          _id: null,
          times: { $push: '$responseTime' },
          avg: { $avg: '$responseTime' },
          min: { $min: '$responseTime' },
          max: { $max: '$responseTime' },
          count: { $sum: 1 },
        },
      },
      {
        $project: {
          avg: 1,
          min: 1,
          max: 1,
          count: 1,
          p50: { $arrayElemAt: ['$times', { $floor: { $multiply: [0.5, '$count'] } }] },
          p95: { $arrayElemAt: ['$times', { $floor: { $multiply: [0.95, '$count'] } }] },
          p99: { $arrayElemAt: ['$times', { $floor: { $multiply: [0.99, '$count'] } }] },
        },
      },
    ]);

    res.json({
      success: true,
      data: responseTimes[0] || { avg: 0, min: 0, max: 0, p50: 0, p95: 0, p99: 0, count: 0 },
    });
  } catch (error) {
    logger.error(`Response times error: ${error.message}`);
    res.status(500).json({ success: false, error: 'Failed to fetch response times.' });
  }
};

module.exports = {
  getOverview,
  getRequestTrend,
  getTopApis,
  getTopKeys,
  getRecentLogs,
  getResponseTimes,
};
