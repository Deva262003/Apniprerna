const mongoose = require('mongoose');

const blockedSiteSchema = new mongoose.Schema({
  pattern: {
    type: String,
    required: [true, 'Pattern is required'],
    trim: true
  },
  patternType: {
    type: String,
    enum: ['domain', 'url', 'regex'],
    default: 'domain'
  },
  category: {
    type: String,
    enum: ['adult', 'gambling', 'social_media', 'gaming', 'streaming', 'malware', 'violence', 'drugs', 'custom'],
    default: 'custom'
  },
  scope: {
    type: String,
    enum: ['global', 'center', 'student'],
    default: 'global'
  },
  scopeId: {
    type: mongoose.Schema.Types.ObjectId,
    refPath: 'scopeModel'
  },
  scopeModel: {
    type: String,
    enum: ['Center', 'Student']
  },
  description: {
    type: String,
    trim: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  addedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin'
  }
}, {
  timestamps: true
});

// Index for efficient blocklist lookups
blockedSiteSchema.index({ scope: 1, isActive: 1 });
blockedSiteSchema.index({ pattern: 1 });
blockedSiteSchema.index({ category: 1 });

module.exports = mongoose.model('BlockedSite', blockedSiteSchema);
