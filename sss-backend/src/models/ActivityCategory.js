const mongoose = require('mongoose');

const activityCategorySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    unique: true
  },
  description: {
    type: String,
    trim: true,
    default: ''
  },
  color: {
    type: String,
    trim: true,
    default: 'slate'
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

activityCategorySchema.index({ isActive: 1 });

module.exports = mongoose.model('ActivityCategory', activityCategorySchema);
