require('dotenv').config();

module.exports = {
  nodeEnv:          process.env.NODE_ENV || 'development', // Changed to dev for local
  port:             parseInt(process.env.PORT, 10) || 10000,
  mongodbUri:       process.env.MONGODB_URI,
  jwtSecret:        process.env.JWT_SECRET || 'HwfKnsMoSMwYtifNc1onLdQ2a5dSzIlV', // added fallback for local
  jwtExpiresIn:     process.env.JWT_EXPIRES_IN || '24h',
  adminEmail:       process.env.ADMIN_EMAIL || 'admin@apigateway.com',
  adminPassword:    process.env.ADMIN_PASSWORD || 'Admin@123456',
  rateLimitWindowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 900000,
  rateLimitMaxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS, 10) || 100,
};
