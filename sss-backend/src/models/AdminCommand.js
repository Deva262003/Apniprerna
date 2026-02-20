const mongoose = require('mongoose');

const adminCommandSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['FORCE_LOGOUT', 'SYNC_BLOCKLIST'],
    required: true
  },
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
  scope: {
    type: String,
    enum: ['student', 'center', 'all'],
    required: true
  },
  scopeId: {
    type: mongoose.Schema.Types.ObjectId
  },
  payload: {
    type: mongoose.Schema.Types.Mixed
  },
  status: {
    type: String,
    enum: ['pending', 'sent', 'acknowledged', 'failed'],
    default: 'pending'
  },
  attempts: {
    type: Number,
    default: 0
  },
  lastAttemptAt: {
    type: Date
  },
  deliveredAt: {
    type: Date
  },
  acknowledgedAt: {
    type: Date
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin'
  },
  createdByParent: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Parent'
  },
  error: {
    type: String
  },
  batchId: {
    type: String
  }
}, {
  timestamps: true
});

adminCommandSchema.index({ student: 1, status: 1, createdAt: -1 });
adminCommandSchema.index({ center: 1, createdAt: -1 });
adminCommandSchema.index({ batchId: 1 });

module.exports = mongoose.model('AdminCommand', adminCommandSchema);
