/**
 * Validate email format
 */
const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Validate URL format
 */
const isValidUrl = (url) => {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

/**
 * Validate custom endpoint (alphanumeric, hyphens, underscores, slashes, dots)
 */
const isValidEndpoint = (endpoint) => {
  const endpointRegex = /^[a-zA-Z0-9_./-]+$/;
  return endpointRegex.test(endpoint);
};

/**
 * Sanitize input string
 */
const sanitize = (str) => {
  if (typeof str !== 'string') return str;
  return str.replace(/[<>]/g, '').trim();
};

/**
 * Validate API creation/update payload
 */
const validateApiPayload = (data) => {
  const errors = [];

  if (!data.name || data.name.trim().length < 2) {
    errors.push('API name must be at least 2 characters');
  }

  if (!data.customEndpoint || !isValidEndpoint(data.customEndpoint)) {
    errors.push('Custom endpoint must be alphanumeric (hyphens and underscores allowed)');
  }

  if (!data.upstreamUrl || !isValidUrl(data.upstreamUrl)) {
    errors.push('Valid upstream URL is required');
  }

  if (!data.method || !['GET', 'POST', 'PUT', 'DELETE', 'PATCH'].includes(data.method.toUpperCase())) {
    errors.push('Valid HTTP method is required (GET, POST, PUT, DELETE, PATCH)');
  }

  if (!data.paramName || data.paramName.trim().length < 1) {
    errors.push('Parameter name is required');
  }

  if (data.rateLimit) {
    if (data.rateLimit.requestsPerDay && (data.rateLimit.requestsPerDay < 1 || data.rateLimit.requestsPerDay > 1000000)) {
      errors.push('Requests per day must be between 1 and 1,000,000');
    }
    if (data.rateLimit.requestsPerMinute && (data.rateLimit.requestsPerMinute < 1 || data.rateLimit.requestsPerMinute > 10000)) {
      errors.push('Requests per minute must be between 1 and 10,000');
    }
  }

  return { isValid: errors.length === 0, errors };
};

/**
 * Validate API key generation payload
 */
const validateKeyPayload = (data) => {
  const errors = [];

  if (data.metadata && data.metadata.name && data.metadata.name.trim().length < 2) {
    errors.push('Key name must be at least 2 characters');
  }

  if (data.expiresAt) {
    const expiryDate = new Date(data.expiresAt);
    if (isNaN(expiryDate.getTime())) {
      errors.push('Invalid expiry date format');
    } else if (expiryDate <= new Date()) {
      errors.push('Expiry date must be in the future');
    }
  }

  if (data.allowedApis && !Array.isArray(data.allowedApis)) {
    errors.push('Allowed APIs must be an array');
  }

  return { isValid: errors.length === 0, errors };
};

module.exports = {
  isValidEmail,
  isValidUrl,
  isValidEndpoint,
  sanitize,
  validateApiPayload,
  validateKeyPayload,
};
