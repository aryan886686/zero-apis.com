const mongoose = require('mongoose');

const statsSchema = new mongoose.Schema(
  {
    date: {
      type: Date,
      required: true,
      unique: true,
    },
    totalRequests: {
      type: Number,
      default: 0,
    },
    successfulRequests: {
      type: Number,
      default: 0,
    },
    failedRequests: {
      type: Number,
      default: 0,
    },
    totalBandwidth: {
      type: Number,
      default: 0,
    },
    averageResponseTime: {
      type: Number,
      default: 0,
    },
    topApis: [
      {
        apiId: { type: mongoose.Schema.Types.ObjectId, ref: 'Api' },
        name: String,
        count: Number,
      },
    ],
    topKeys: [
      {
        keyId: { type: mongoose.Schema.Types.ObjectId, ref: 'ApiKey' },
        name: String,
        count: Number,
      },
    ],
    hourlyBreakdown: [
      {
        hour: Number,
        requests: Number,
        errors: Number,
      },
    ],
  },
  {
    timestamps: true,
  }
);

statsSchema.index({ date: -1 });

module.exports = mongoose.model('Stats', statsSchema);
