const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const apiKeySchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: true,
      unique: true,
    },
    status: {
      type: String,
      enum: ['active', 'suspended', 'revoked', 'expired'],
      default: 'active',
    },
    allowedApis: {
      type: [String],
      default: ['*'],
    },
    expiresAt: {
      type: Date,
      required: true,
    },
    lastUsedAt: {
      type: Date,
      default: null,
    },
    usageToday: {
      type: Number,
      default: 0,
    },
    usageThisMonth: {
      type: Number,
      default: 0,
    },
    totalUsage: {
      type: Number,
      default: 0,
    },
    createdBy: {
      type: String,
      default: 'admin',
    },
    metadata: {
      name: { type: String, default: 'Unnamed Key' },
      description: { type: String, default: '' },
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Virtual for days remaining
apiKeySchema.virtual('daysRemaining').get(function () {
  if (!this.expiresAt) return null;
  const now = new Date();
  const diff = this.expiresAt - now;
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
});

// Virtual for expired status
apiKeySchema.virtual('isExpired').get(function () {
  return this.expiresAt && new Date() > this.expiresAt;
});

// Removed bcrypt pre-save hook for raw keys

// Indexes
apiKeySchema.index({ key: 1 });
apiKeySchema.index({ status: 1 });
apiKeySchema.index({ expiresAt: 1 });
apiKeySchema.index({ createdAt: -1 });

const ApiKey = mongoose.model('ApiKey', apiKeySchema);

// Attempt to drop the obsolete keyHash_1 index that causes duplicate key errors
mongoose.connection.once('open', () => {
  ApiKey.collection.dropIndex('keyHash_1').catch(err => {
    // Ignore error if index doesn't exist
  });
});

module.exports = ApiKey;
