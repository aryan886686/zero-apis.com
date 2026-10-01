const { getRedis } = require('../config/redis');
const logger = require('../utils/logger');

/**
 * Redis-based rate limiter for API gateway
 * Supports per-minute and per-day limits per key per endpoint
 */
const rateLimiter = async (req, res, next) => {
  const redis = getRedis();

  // If Redis is not available, skip rate limiting
  if (!redis) {
    return next();
  }

  try {
    const apiKey = req.apiKeyDoc;
    const api = req.apiDoc;

    if (!apiKey || !api) {
      return next();
    }

    const now = new Date();
    const currentMinute = `${now.getFullYear()}-${now.getMonth()}-${now.getDate()}-${now.getHours()}-${now.getMinutes()}`;
    const currentDay = `${now.getFullYear()}-${now.getMonth()}-${now.getDate()}`;

    // Per-minute rate limit
    const minuteKey = `ratelimit:${apiKey._id}:${api.customEndpoint}:minute:${currentMinute}`;
    const minuteCount = await redis.incr(minuteKey);
    if (minuteCount === 1) {
      await redis.expire(minuteKey, 60);
    }

    if (minuteCount > api.rateLimit.requestsPerMinute) {
      return res.status(429).json({
        success: false,
        error: 'Rate limit exceeded. Too many requests per minute.',
        retryAfter: 60,
      });
    }

    // Per-day rate limit
    const dayKey = `ratelimit:${apiKey._id}:${api.customEndpoint}:day:${currentDay}`;
    const dayCount = await redis.incr(dayKey);
    if (dayCount === 1) {
      await redis.expire(dayKey, 86400);
    }

    if (dayCount > api.rateLimit.requestsPerDay) {
      return res.status(429).json({
        success: false,
        error: 'Daily rate limit exceeded.',
        retryAfter: 86400,
      });
    }

    // Set rate limit headers
    res.set('X-RateLimit-Limit-Minute', api.rateLimit.requestsPerMinute);
    res.set('X-RateLimit-Remaining-Minute', Math.max(0, api.rateLimit.requestsPerMinute - minuteCount));
    res.set('X-RateLimit-Limit-Day', api.rateLimit.requestsPerDay);
    res.set('X-RateLimit-Remaining-Day', Math.max(0, api.rateLimit.requestsPerDay - dayCount));

    next();
  } catch (error) {
    logger.error(`Rate limiter error: ${error.message}`);
    // Don't block requests if rate limiter fails
    next();
  }
};

module.exports = { rateLimiter };
