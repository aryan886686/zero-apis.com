const Redis = require('ioredis');
const config = require('./env');
const logger = require('../utils/logger');

let redis = null;

const createRedisClient = () => {
  if (redis) return redis;

  try {
    redis = new Redis(config.redisUrl, {
      maxRetriesPerRequest: 3,
      retryDelayOnFailover: 100,
      lazyConnect: true,
      enableReadyCheck: true,
    });

    redis.on('connect', () => {
      logger.info('Redis connected');
    });

    redis.on('error', (err) => {
      logger.error(`Redis error: ${err.message}`);
    });

    redis.on('close', () => {
      logger.warn('Redis connection closed');
    });

    redis.connect().catch((err) => {
      logger.warn(`Redis connection failed: ${err.message}. Running without Redis.`);
      redis = null;
    });
  } catch (err) {
    logger.warn(`Redis init failed: ${err.message}. Running without Redis.`);
    redis = null;
  }

  return redis;
};

const getRedis = () => redis;

module.exports = { createRedisClient, getRedis };
