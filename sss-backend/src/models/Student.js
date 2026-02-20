const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const studentSchema = new mongoose.Schema({
  studentId: {
    type: String,
    required: [true, 'Student ID is required'],
    unique: true,
    trim: true,
    validate: {
      validator: function(v) {
        return /^\d{6,8}$/.test(v);
      },
      message: 'Student ID must be 6-8 digits'
    }
  },
  pinHash: {
    type: String,
    required: [true, 'PIN is required']
  },
  name: {
    type: String,
    required: [true, 'Student name is required'],
    trim: true
  },
  email: {
    type: String,
    trim: true,
    lowercase: true
  },
  phone: {
    type: String,
    trim: true
  },
  center: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Center',
    required: [true, 'Center is required']
  },
  grade: {
    type: String,
    trim: true
  },
  section: {
    type: String,
    trim: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  lastLoginAt: {
    type: Date
  }
}, {
  timestamps: true
});

// Hash PIN before saving
studentSchema.pre('save', async function(next) {
  if (!this.isModified('pinHash')) {
    return next();
  }
  // Only hash if it looks like a plain PIN (4 digits)
  if (/^\d{4}$/.test(this.pinHash)) {
    const salt = await bcrypt.genSalt(10);
    this.pinHash = await bcrypt.hash(this.pinHash, salt);
  }
  next();
});

// Compare PIN
studentSchema.methods.comparePin = async function(enteredPin) {
  return await bcrypt.compare(enteredPin, this.pinHash);
};

// Index for faster lookups
studentSchema.index({ center: 1 });
studentSchema.index({ isActive: 1 });

module.exports = mongoose.model('Student', studentSchema);
