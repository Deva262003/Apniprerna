const mongoose = require('mongoose');

const activitySchema = new mongoose.Schema({
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: true
  },
  center: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Center',
    required: true
  },
  url: {
    type: String,
    required: true
  },
  domain: {
    type: String,
    required: true,
    index: true
  },
  title: {
    type: String,
    default: ''
  },
  favicon: {
    type: String
  },
  visitTime: {
    type: Date,
    required: true,
    index: true
  },
  durationSeconds: {
    type: Number,
    default: 0
  },
  idleSeconds: {
    type: Number,
    default: 0
  },
  wasBlocked: {
    type: Boolean,
    default: false,
    index: true
  },
  blockReason: {
    type: String
  },
  blockCategory: {
    type: String
  },
  category: {
    type: String,
    default: null,
    index: true
  }
}, {
  timestamps: true
});

// Compound indexes for efficient queries
activitySchema.index({ student: 1, visitTime: -1 });
activitySchema.index({ center: 1, visitTime: -1 });
activitySchema.index({ wasBlocked: 1, visitTime: -1 });

// TTL index to auto-delete old activity logs after 90 days (optional)
// activitySchema.index({ visitTime: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 });

module.exports = mongoose.model('Activity', activitySchema);
