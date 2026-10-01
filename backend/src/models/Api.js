const mongoose = require('mongoose');

const apiSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'API name is required'],
      trim: true,
      maxlength: 100,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 500,
      default: '',
    },
    customEndpoint: {
      type: String,
      required: [true, 'Custom endpoint is required'],
      unique: true,
      trim: true,
      lowercase: true,
      match: [/^[a-zA-Z0-9_./-]+$/, 'Endpoint must be alphanumeric, slashes, or dots'],
    },
    upstreamUrl: {
      type: String,
      required: [true, 'Upstream URL is required'],
      trim: true,
    },
    method: {
      type: String,
      required: true,
      enum: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
      default: 'GET',
    },
    paramName: {
      type: String,
      required: [true, 'Parameter name is required'],
      trim: true,
    },
    optionalHeaders: {
      type: Map,
      of: String,
      default: {},
    },
    status: {
      type: String,
      enum: ['active', 'suspended', 'maintenance'],
      default: 'active',
    },
    rateLimit: {
      requestsPerDay: { type: Number, default: 10000 },
      requestsPerMinute: { type: Number, default: 100 },
      concurrentRequests: { type: Number, default: 50 },
    },
    caching: {
      enabled: { type: Boolean, default: false },
      ttl: { type: Number, default: 3600 },
    },
    totalRequests: {
      type: Number,
      default: 0,
    },
    createdBy: {
      type: String,
      default: 'admin',
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Index for fast lookups
apiSchema.index({ customEndpoint: 1 });
apiSchema.index({ status: 1 });
apiSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Api', apiSchema);
