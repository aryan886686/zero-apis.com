const mongoose = require('mongoose');

const cacheSchema = new mongoose.Schema(
  {
    cacheKey: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    responseBody: {
      type: String,
      required: true,
    },
    statusCode: {
      type: Number,
      required: true,
    },
    contentType: {
      type: String,
      default: 'application/json',
    },
  },
  {
    timestamps: true,
  }
);

// Auto-delete cache after 24 hours (86400 seconds)
cacheSchema.index({ createdAt: 1 }, { expireAfterSeconds: 86400 });

module.exports = mongoose.model('Cache', cacheSchema);
