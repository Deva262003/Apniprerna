const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const { Student, Admin, Parent, Session, Center } = require('../models');
const { protectStudent, protectAdmin, protectParent } = require('../middleware/auth');

// ============================================
// STUDENT AUTHENTICATION (for Chrome Extension)
// ============================================

// @route   POST /api/v1/auth/student/login
// @desc    Student login with studentId + PIN
// @access  Public
router.post('/student/login', [
  body('studentId')
    .trim()
    .matches(/^\d{6,8}$/)
    .withMessage('Student ID must be 6-8 digits'),
  body('pin')
    .matches(/^\d{4}$/)
    .withMessage('PIN must be 4 digits'),
  body('deviceId')
    .optional()
    .isString()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { studentId, pin, deviceId } = req.body;

    // Find student and populate center
    const student = await Student.findOne({ studentId }).populate('center', 'name code');

    if (!student) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    if (!student.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Account is deactivated'
      });
    }

    // Verify PIN
    const isMatch = await student.comparePin(pin);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Revoke any existing active sessions for this student (single device policy)
    await Session.updateMany(
      { student: student._id, status: 'active' },
      { status: 'revoked', revokedAt: new Date() }
    );

    // Create new session
    const sessionToken = Session.generateToken();
    const expiresAt = new Date(Date.now() + 8 * 60 * 60 * 1000); // 8 hours

    const session = await Session.create({
      student: student._id,
      sessionToken,
      deviceId,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      expiresAt
    });

    // Update last login
    student.lastLoginAt = new Date();
    await student.save();

    res.status(200).json({
      success: true,
      data: {
        sessionToken,
        expiresAt,
        student: {
          id: student._id,
          studentId: student.studentId,
          name: student.name,
          center: student.center
        }
      }
    });
  } catch (error) {
    console.error('Student login error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   GET /api/v1/auth/student/session
// @desc    Validate student session
// @access  Protected (Session Token)
router.get('/student/session', protectStudent, async (req, res) => {
  try {
    res.status(200).json({
      success: true,
      data: {
        valid: true,
        expiresAt: req.session.expiresAt,
        student: {
          id: req.student._id,
          studentId: req.student.studentId,
          name: req.student.name,
          center: req.student.center
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   POST /api/v1/auth/student/logout
// @desc    Student logout
// @access  Protected (Session Token)
router.post('/student/logout', protectStudent, async (req, res) => {
  try {
    await Session.findByIdAndUpdate(req.session._id, {
      status: 'revoked',
      revokedAt: new Date()
    });

    res.status(200).json({
      success: true,
      message: 'Logged out successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// ============================================
// ADMIN AUTHENTICATION (for Dashboard)
// ============================================

// @route   POST /api/v1/auth/admin/login
// @desc    Admin login with email + password
// @access  Public
router.post('/admin/login', [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Valid email is required'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { email, password } = req.body;

    // Find admin and populate center
    const admin = await Admin.findOne({ email }).populate('center', 'name code');

    if (!admin) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    if (!admin.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Account is deactivated'
      });
    }

    // Verify password
    const isMatch = await admin.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Update last login
    admin.lastLoginAt = new Date();
    await admin.save();

    // Generate JWT
    const token = jwt.sign(
      { id: admin._id, role: admin.role, kind: 'admin' },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    res.status(200).json({
      success: true,
      data: {
        token,
        admin: {
          id: admin._id,
          email: admin.email,
          name: admin.name,
          role: admin.role,
          center: admin.center
        }
      }
    });
  } catch (error) {
    console.error('Admin login error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// ============================================
// PARENT AUTHENTICATION (Parent Portal)
// ============================================

// @route   POST /api/v1/auth/parent/login
// @desc    Parent login with parentId + password
// @access  Public
router.post(
  '/parent/login',
  [
    body('parentId').trim().isLength({ min: 8, max: 8 }).withMessage('Parent ID must be 8 characters'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }

      const parentIdInput = String(req.body.parentId || '').trim();
      const normalizedParentId = parentIdInput.toUpperCase();
      const { password } = req.body;

      const parent = await Parent.findOne({ parentId: normalizedParentId })
        .populate('center', 'name code');

      if (!parent) {
        return res.status(401).json({ success: false, message: 'Invalid credentials' });
      }

      if (!parent.isActive) {
        return res.status(401).json({ success: false, message: 'Account is deactivated' });
      }

      const isMatch = await parent.comparePassword(password);
      if (!isMatch) {
        return res.status(401).json({ success: false, message: 'Invalid credentials' });
      }

      parent.lastLoginAt = new Date();
      await parent.save();

      const token = jwt.sign(
        { id: parent._id, kind: 'parent' },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
      );

      res.status(200).json({
        success: true,
        data: {
          token,
          parent: {
            id: parent._id,
            parentId: parent.parentId,
            parentIdType: parent.parentIdType,
            name: parent.name,
            mustChangePassword: parent.mustChangePassword,
            center: parent.center
          }
        }
      });
    } catch (error) {
      console.error('Parent login error:', error);
      res.status(500).json({ success: false, message: 'Server error' });
    }
  }
);

// @route   GET /api/v1/auth/parent/me
// @desc    Get current parent info
// @access  Protected (JWT)
router.get('/parent/me', protectParent, async (req, res) => {
  try {
    const parent = await Parent.findById(req.parent._id)
      .select('-passwordHash')
      .populate('center', 'name code');

    res.status(200).json({ success: true, data: parent });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   POST /api/v1/auth/parent/logout
// @desc    Parent logout (client-side token removal)
// @access  Protected (JWT)
router.post('/parent/logout', protectParent, async (req, res) => {
  res.status(200).json({ success: true, message: 'Logged out successfully' });
});

// @route   GET /api/v1/auth/admin/me
// @desc    Get current admin info
// @access  Protected (JWT)
router.get('/admin/me', protectAdmin, async (req, res) => {
  try {
    const admin = await Admin.findById(req.admin._id)
      .select('-passwordHash')
      .populate('center', 'name code');

    res.status(200).json({
      success: true,
      data: admin
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   POST /api/v1/auth/admin/change-password
// @desc    Change current admin password
// @access  Protected (JWT)
router.post(
  '/admin/change-password',
  protectAdmin,
  [
    body('currentPassword')
      .isLength({ min: 6 })
      .withMessage('Current password must be at least 6 characters'),
    body('newPassword')
      .isLength({ min: 6 })
      .withMessage('New password must be at least 6 characters')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }

      const { currentPassword, newPassword } = req.body;

      if (currentPassword === newPassword) {
        return res.status(400).json({ success: false, message: 'New password must be different' });
      }

      // protectAdmin strips passwordHash, so refetch
      const admin = await Admin.findById(req.admin._id);
      if (!admin) {
        return res.status(404).json({ success: false, message: 'Admin not found' });
      }

      const isMatch = await admin.comparePassword(currentPassword);
      if (!isMatch) {
        return res.status(401).json({ success: false, message: 'Current password is incorrect' });
      }

      admin.passwordHash = newPassword;
      await admin.save();

      return res.status(200).json({ success: true, message: 'Password updated successfully' });
    } catch (error) {
      console.error('Admin change password error:', error);
      return res.status(500).json({ success: false, message: 'Server error' });
    }
  }
);

// @route   POST /api/v1/auth/admin/logout
// @desc    Admin logout (client-side token removal)
// @access  Protected (JWT)
router.post('/admin/logout', protectAdmin, async (req, res) => {
  // JWT tokens are stateless, so we just send success
  // Client should remove the token from storage
  res.status(200).json({
    success: true,
    message: 'Logged out successfully'
  });
});

module.exports = router;
