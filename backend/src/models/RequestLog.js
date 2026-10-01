const mongoose = require('mongoose');

const requestLogSchema = new mongoose.Schema(
  {
    keyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ApiKey',
      default: null,
    },
    apiId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Api',
      default: null,
    },
    endpoint: {
      type: String,
      required: true,
    },
    method: {
      type: String,
      default: 'GET',
    },
    statusCode: {
      type: Number,
      default: 200,
    },
    responseTime: {
      type: Number,
      default: 0,
    },
    requestSize: {
      type: Number,
      default: 0,
    },
    responseSize: {
      type: Number,
      default: 0,
    },
    ipAddress: {
      type: String,
      default: '',
    },
    userAgent: {
      type: String,
      default: '',
    },
    error: {
      type: String,
      default: null,
    },
    queryParams: {
      type: Map,
      of: String,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for fast querying
requestLogSchema.index({ createdAt: -1 });
requestLogSchema.index({ keyId: 1, createdAt: -1 });
requestLogSchema.index({ apiId: 1, createdAt: -1 });
requestLogSchema.index({ endpoint: 1, createdAt: -1 });
requestLogSchema.index({ statusCode: 1 });

// Auto-delete logs older than 24 hours (86400 seconds)
requestLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 86400 });

module.exports = mongoose.model('RequestLog', requestLogSchema);
