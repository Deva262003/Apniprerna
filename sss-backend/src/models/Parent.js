const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const PARENT_ID_TYPES = ['numeric', 'alphanumeric'];

const parentSchema = new mongoose.Schema(
  {
    parentId: {
      type: String,
      required: [true, 'Parent ID is required'],
      unique: true,
      trim: true
    },
    parentIdType: {
      type: String,
      enum: PARENT_ID_TYPES,
      required: [true, 'Parent ID type is required']
    },
    passwordHash: {
      type: String,
      required: [true, 'Password is required']
    },
    mustChangePassword: {
      type: Boolean,
      default: true
    },
    passwordChangedAt: {
      type: Date
    },
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true
    },
    phone: {
      type: String,
      trim: true
    },
    email: {
      type: String,
      trim: true,
      lowercase: true
    },
    students: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Student',
        required: true
      }
    ],
    center: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Center',
      required: [true, 'Center is required']
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Admin'
    },
    isActive: {
      type: Boolean,
      default: true
    },
    lastLoginAt: {
      type: Date
    }
  },
  {
    timestamps: true
  }
);

parentSchema.pre('validate', function (next) {
  if (typeof this.parentId === 'string') {
    this.parentId = this.parentId.trim();
    if (this.parentIdType === 'alphanumeric') {
      this.parentId = this.parentId.toUpperCase();
    }
  }
  next();
});

parentSchema.path('parentId').validate(function (v) {
  if (!v || !this.parentIdType) return false;

  if (this.parentIdType === 'numeric') {
    return /^\d{8}$/.test(v);
  }

  if (this.parentIdType === 'alphanumeric') {
    return /^[A-Z0-9]{8}$/.test(v);
  }

  return false;
}, 'Parent ID is invalid');

// Hash password before saving
parentSchema.pre('save', async function (next) {
  if (!this.isModified('passwordHash')) {
    return next();
  }
  const salt = await bcrypt.genSalt(12);
  this.passwordHash = await bcrypt.hash(this.passwordHash, salt);
  next();
});

parentSchema.methods.comparePassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.passwordHash);
};

parentSchema.index({ center: 1 });
parentSchema.index({ students: 1 });
parentSchema.index({ isActive: 1 });

module.exports = mongoose.model('Parent', parentSchema);
