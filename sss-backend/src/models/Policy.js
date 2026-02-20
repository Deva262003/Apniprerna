const mongoose = require('mongoose');

const policySchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Policy name is required'],
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  policyType: {
    type: String,
    enum: ['blocklist', 'allowlist', 'time_restriction'],
    required: true
  },
  scope: {
    type: String,
    enum: ['global', 'center', 'student'],
    required: true
  },
  center: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Center'
  },
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student'
  },
  rules: {
    type: mongoose.Schema.Types.Mixed,
    required: true
    /*
    Example rules structure:

    Blocklist: {
      blockedCategories: ['adult', 'gambling'],
      blockedDomains: ['facebook.com', 'instagram.com'],
      blockedPatterns: ['*game*', '*porn*']
    }

    Allowlist: {
      allowedDomains: ['google.com', 'khan-academy.org'],
      allowOnlyListed: true
    }

    Time restriction: {
      allowedHours: { start: '09:00', end: '17:00' },
      allowedDays: [1, 2, 3, 4, 5],
      timezone: 'Asia/Kolkata'
    }
    */
  },
  priority: {
    type: Number,
    default: 0
    // Higher priority takes precedence
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin'
  }
}, {
  timestamps: true
});

// Index for efficient policy lookups
policySchema.index({ scope: 1, isActive: 1, priority: -1 });
policySchema.index({ center: 1 });
policySchema.index({ student: 1 });

module.exports = mongoose.model('Policy', policySchema);
