const mongoose = require('mongoose');

const centerSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Center name is required'],
    trim: true
  },
  code: {
    type: String,
    required: [true, 'Center code is required'],
    unique: true,
    uppercase: true,
    trim: true
  },
  pmsPodId: {
    type: String,
    unique: true,
    sparse: true,
    trim: true
  },
  address: {
    type: String,
    trim: true
  },
  city: {
    type: String,
    trim: true
  },
  state: {
    type: String,
    trim: true
  },
  pincode: {
    type: String,
    trim: true
  },
  contactName: {
    type: String,
    trim: true
  },
  contactPhone: {
    type: String,
    trim: true
  },
  contactEmail: {
    type: String,
    trim: true,
    lowercase: true
  },
  timezone: {
    type: String,
    default: 'Asia/Kolkata'
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Virtual for student count
centerSchema.virtual('studentCount', {
  ref: 'Student',
  localField: '_id',
  foreignField: 'center',
  count: true
});

// Ensure virtuals are included in JSON
centerSchema.set('toJSON', { virtuals: true });
centerSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Center', centerSchema);
