const express = require('express');
const { body, param, query, validationResult } = require('express-validator');
const { protectAdmin, authorize } = require('../middleware/auth');
const { Parent, Student } = require('../models');
const crypto = require('crypto');

const router = express.Router();

function validateRequest(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }
  next();
}

const ALPHANUM = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

function randomFromCharset(length, charset) {
  let out = '';
  for (let i = 0; i < length; i += 1) {
    out += charset.charAt(crypto.randomInt(0, charset.length));
  }
  return out;
}

async function generateUniqueParentId(parentIdType) {
  for (let i = 0; i < 12; i += 1) {
    const candidate = parentIdType === 'numeric'
      ? String(crypto.randomInt(0, 10 ** 8)).padStart(8, '0')
      : randomFromCharset(8, ALPHANUM);

    // Stored as uppercase for alphanumeric; numeric unaffected
    const exists = await Parent.findOne({ parentId: candidate }).select('_id');
    if (!exists) return candidate;
  }
  throw new Error('Failed to generate unique parentId');
}

function generateTempPassword() {
  // Not super fancy, but good enough for a one-time temp password
  return randomFromCharset(10, 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789');
}

async function resolveStudentsAndCenter(studentIds) {
  const students = await Student.find({ _id: { $in: studentIds } }).select('_id center isActive name studentId');
  if (!students || students.length !== studentIds.length) {
    return { error: 'One or more students not found' };
  }

  const centerIds = new Set(students.map((s) => s.center?.toString()).filter(Boolean));
  if (centerIds.size !== 1) {
    return { error: 'All linked students must be from the same center' };
  }

  return { students, centerId: Array.from(centerIds)[0] };
}

router.use(protectAdmin);
router.use(authorize('super_admin', 'admin', 'pod_admin'));

// @route   GET /api/v1/parents
// @desc    List parents (center-scoped for pod_admin)
router.get(
  '/',
  [
    query('center').optional().isMongoId(),
    query('search').optional().isString()
  ],
  validateRequest,
  async (req, res) => {
    try {
      const filter = {};
      if (req.admin.role === 'pod_admin') {
        filter.center = req.admin.center;
      } else if (req.query.center) {
        filter.center = req.query.center;
      }

      if (req.query.search) {
        const q = String(req.query.search).trim();
        filter.$or = [
          { name: { $regex: q, $options: 'i' } },
          { parentId: { $regex: q.toUpperCase(), $options: 'i' } }
        ];
      }

      const parents = await Parent.find(filter)
        .select('-passwordHash')
        .populate('center', 'name code')
        .populate('students', 'name studentId')
        .sort({ createdAt: -1 });

      res.status(200).json({ success: true, data: parents });
    } catch (error) {
      console.error('List parents error:', error);
      res.status(500).json({ success: false, message: 'Server error' });
    }
  }
);

// @route   POST /api/v1/parents
// @desc    Create parent + temp password
router.post(
  '/',
  [
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('parentIdType').isIn(['numeric', 'alphanumeric']).withMessage('Invalid parent ID type'),
    body('parentId').optional().isString(),
    body('students').isArray({ min: 1 }).withMessage('At least one student is required'),
    body('students.*').isMongoId().withMessage('Invalid student id'),
    body('phone').optional().isString(),
    body('email').optional().isEmail()
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }

      const { name, parentIdType, students: studentIds, phone, email } = req.body;
      let parentId = req.body.parentId ? String(req.body.parentId).trim() : '';
      if (parentIdType === 'alphanumeric' && parentId) parentId = parentId.toUpperCase();

      if (parentId) {
        if (parentIdType === 'numeric' && !/^\d{8}$/.test(parentId)) {
          return res.status(400).json({ success: false, message: 'Numeric Parent ID must be exactly 8 digits' });
        }
        if (parentIdType === 'alphanumeric' && !/^[A-Z0-9]{8}$/.test(parentId)) {
          return res.status(400).json({ success: false, message: 'Alphanumeric Parent ID must be exactly 8 characters (A-Z, 0-9)' });
        }
      } else {
        parentId = await generateUniqueParentId(parentIdType);
      }

      const { error, centerId } = await resolveStudentsAndCenter(studentIds);
      if (error) {
        return res.status(400).json({ success: false, message: error });
      }

      if (req.admin.role === 'pod_admin') {
        if (!req.admin.center || req.admin.center.toString() !== centerId) {
          return res.status(403).json({ success: false, message: 'Not authorized to create parents for this center' });
        }
      }

      const existing = await Parent.findOne({ parentId }).select('_id');
      if (existing) {
        return res.status(400).json({ success: false, message: 'Parent ID already exists' });
      }

      const tempPassword = generateTempPassword();

      const parent = await Parent.create({
        parentId,
        parentIdType,
        passwordHash: tempPassword,
        mustChangePassword: true,
        passwordChangedAt: null,
        name,
        phone,
        email,
        students: studentIds,
        center: centerId,
        createdBy: req.admin._id
      });

      const created = await Parent.findById(parent._id)
        .select('-passwordHash')
        .populate('center', 'name code')
        .populate('students', 'name studentId');

      res.status(201).json({
        success: true,
        data: {
          parent: created,
          tempPassword
        }
      });
    } catch (error) {
      console.error('Create parent error:', error);
      res.status(500).json({ success: false, message: 'Server error' });
    }
  }
);

// @route   GET /api/v1/parents/:id
// @desc    Get single parent (center-scoped for pod_admin)
router.get(
  '/:id',
  [param('id').isMongoId().withMessage('Invalid id')],
  validateRequest,
  async (req, res) => {
    try {
      const parent = await Parent.findById(req.params.id)
        .select('-passwordHash')
        .populate('center', 'name code')
        .populate('students', 'name studentId');

      if (!parent) {
        return res.status(404).json({ success: false, message: 'Parent not found' });
      }

      if (req.admin.role === 'pod_admin' && parent.center?.toString() !== req.admin.center?.toString()) {
        return res.status(403).json({ success: false, message: 'Not authorized' });
      }

      res.status(200).json({ success: true, data: parent });
    } catch (error) {
      console.error('Get parent error:', error);
      res.status(500).json({ success: false, message: 'Server error' });
    }
  }
);

// @route   PUT /api/v1/parents/:id
// @desc    Update parent (name, contact, students, active)
router.put(
  '/:id',
  [
    param('id').isMongoId().withMessage('Invalid id'),
    body('name').optional().trim().notEmpty(),
    body('phone').optional().isString(),
    body('email').optional().isEmail(),
    body('isActive').optional().isBoolean(),
    body('students').optional().isArray({ min: 1 }),
    body('students.*').optional().isMongoId()
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }

      const parent = await Parent.findById(req.params.id);
      if (!parent) {
        return res.status(404).json({ success: false, message: 'Parent not found' });
      }

      if (req.admin.role === 'pod_admin' && parent.center?.toString() !== req.admin.center?.toString()) {
        return res.status(403).json({ success: false, message: 'Not authorized' });
      }

      if (req.body.students) {
        const { error, centerId } = await resolveStudentsAndCenter(req.body.students);
        if (error) {
          return res.status(400).json({ success: false, message: error });
        }
        if (req.admin.role === 'pod_admin' && req.admin.center?.toString() !== centerId) {
          return res.status(403).json({ success: false, message: 'Not authorized to link students from this center' });
        }
        parent.students = req.body.students;
        parent.center = centerId;
      }

      if (req.body.name !== undefined) parent.name = req.body.name;
      if (req.body.phone !== undefined) parent.phone = req.body.phone;
      if (req.body.email !== undefined) parent.email = req.body.email;
      if (req.body.isActive !== undefined) parent.isActive = req.body.isActive;

      await parent.save();

      const updated = await Parent.findById(parent._id)
        .select('-passwordHash')
        .populate('center', 'name code')
        .populate('students', 'name studentId');

      res.status(200).json({ success: true, data: updated });
    } catch (error) {
      console.error('Update parent error:', error);
      res.status(500).json({ success: false, message: 'Server error' });
    }
  }
);

// @route   POST /api/v1/parents/:id/reset-password
// @desc    Reset parent password (returns new temp password)
router.post(
  '/:id/reset-password',
  [param('id').isMongoId().withMessage('Invalid id')],
  validateRequest,
  async (req, res) => {
    try {
      const parent = await Parent.findById(req.params.id);
      if (!parent) {
        return res.status(404).json({ success: false, message: 'Parent not found' });
      }

      if (req.admin.role === 'pod_admin' && parent.center?.toString() !== req.admin.center?.toString()) {
        return res.status(403).json({ success: false, message: 'Not authorized' });
      }

      const tempPassword = generateTempPassword();
      parent.passwordHash = tempPassword;
      parent.mustChangePassword = true;
      parent.passwordChangedAt = null;
      await parent.save();

      res.status(200).json({
        success: true,
        data: {
          tempPassword
        }
      });
    } catch (error) {
      console.error('Reset parent password error:', error);
      res.status(500).json({ success: false, message: 'Server error' });
    }
  }
);

module.exports = router;
