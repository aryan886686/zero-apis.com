const crypto = require('crypto');

/**
 * Generate a short secure API key
 * Format: gk_XXXXXX (8 random hex chars)
 */
const generateApiKey = (prefix = 'gk') => {
  const randomPart = crypto.randomBytes(16).toString('hex');
  return `${prefix}_${randomPart}`;
};

/**
 * Generate a short unique ID
 */
const generateShortId = (length = 8) => {
  return crypto.randomBytes(length).toString('hex').slice(0, length);
};

/**
 * Mask an API key appropriately for its length
 */
const maskKey = (key) => {
  if (!key) return '****';
  if (key.length <= 10) {
    return key.slice(0, 3) + '***' + key.slice(-2);
  }
  return key.slice(0, 8) + '****' + key.slice(-4);
};

module.exports = { generateApiKey, generateShortId, maskKey };
