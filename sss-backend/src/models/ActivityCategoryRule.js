const mongoose = require('mongoose');

const activityCategoryRuleSchema = new mongoose.Schema({
  category: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ActivityCategory',
    required: true
  },
  pattern: {
    type: String,
    required: true,
    trim: true
  },
  patternType: {
    type: String,
    enum: ['domain', 'url', 'regex'],
    default: 'domain'
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

activityCategoryRuleSchema.index({ category: 1 });
activityCategoryRuleSchema.index({ pattern: 1, patternType: 1 });
activityCategoryRuleSchema.index({ isActive: 1 });

module.exports = mongoose.model('ActivityCategoryRule', activityCategoryRuleSchema);
