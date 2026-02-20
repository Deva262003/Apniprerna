const express = require('express');
const { body, param, query, validationResult } = require('express-validator');
const { protectParent } = require('../middleware/auth');
const { Parent, Student, Activity, AdminCommand } = require('../models');
const { dispatchCommands } = require('../websocket/commands');

const router = express.Router();

function validateRequest(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }
  next();
}

router.use(protectParent);

// Enforce password change on first login
router.use((req, res, next) => {
  if (!req.parent?.mustChangePassword) return next();

  const allowed = ['/me', '/me/change-password'];
  if (allowed.includes(req.path)) return next();

  return res.status(403).json({
    success: false,
    message: 'Password change required'
  });
});

async function ensureLinkedStudent(parent, studentId) {
  const parentRecord = await Parent.findById(parent._id).select('students');
  if (!parentRecord) return { error: 'Parent not found' };
  const isLinked = parentRecord.students.some((id) => id.toString() === studentId);
  if (!isLinked) return { error: 'Not authorized for this student' };
  return { ok: true };
}

// @route   GET /api/v1/parent/me
router.get('/me', async (req, res) => {
  try {
    const parent = await Parent.findById(req.parent._id)
      .select('-passwordHash')
      .populate('center', 'name code');

    res.status(200).json({ success: true, data: parent });
  } catch (error) {
    console.error('Parent me error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   POST /api/v1/parent/me/change-password
router.post(
  '/me/change-password',
  [
    body('currentPassword').isString().notEmpty(),
    body('newPassword').isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }

      const parent = await Parent.findById(req.parent._id);
      if (!parent) {
        return res.status(404).json({ success: false, message: 'Parent not found' });
      }

      const isMatch = await parent.comparePassword(req.body.currentPassword);
      if (!isMatch) {
        return res.status(401).json({ success: false, message: 'Current password is incorrect' });
      }

      parent.passwordHash = req.body.newPassword;
      parent.mustChangePassword = false;
      parent.passwordChangedAt = new Date();
      await parent.save();

      const updated = await Parent.findById(parent._id).select('-passwordHash').populate('center', 'name code');
      res.status(200).json({ success: true, data: updated });
    } catch (error) {
      console.error('Parent change password error:', error);
      res.status(500).json({ success: false, message: 'Server error' });
    }
  }
);

// @route   GET /api/v1/parent/students
router.get('/students', async (req, res) => {
  try {
    const parent = await Parent.findById(req.parent._id).select('students').populate({
      path: 'students',
      select: 'name studentId center isActive lastLoginAt',
      populate: { path: 'center', select: 'name code' }
    });
    res.status(200).json({ success: true, data: parent?.students || [] });
  } catch (error) {
    console.error('Parent students error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   GET /api/v1/parent/students/:id/stats
router.get('/students/:id/stats', [param('id').isMongoId()], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const studentId = req.params.id;
    const link = await ensureLinkedStudent(req.parent, studentId);
    if (link.error) {
      return res.status(403).json({ success: false, message: link.error });
    }

    const student = await Student.findById(studentId).select('_id');
    if (!student) {
      return res.status(404).json({ success: false, message: 'Student not found' });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [
      todayActivity,
      todayBlocked,
      totalActivity,
      totalBlocked,
      topDomains,
      topBlockedCategories,
      totalTimeToday
    ] = await Promise.all([
      Activity.countDocuments({ student: student._id, visitTime: { $gte: today } }),
      Activity.countDocuments({ student: student._id, visitTime: { $gte: today }, wasBlocked: true }),
      Activity.countDocuments({ student: student._id }),
      Activity.countDocuments({ student: student._id, wasBlocked: true }),
      Activity.aggregate([
        { $match: { student: student._id, visitTime: { $gte: today } } },
        { $group: { _id: '$domain', count: { $sum: 1 }, totalDuration: { $sum: '$durationSeconds' } } },
        { $sort: { count: -1 } },
        { $limit: 10 }
      ]),
      Activity.aggregate([
        { $match: { student: student._id, wasBlocked: true, visitTime: { $gte: today } } },
        { $group: { _id: '$blockCategory', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ]),
      Activity.aggregate([
        { $match: { student: student._id, visitTime: { $gte: today } } },
        { $group: { _id: null, totalSeconds: { $sum: '$durationSeconds' } } }
      ])
    ]);

    res.status(200).json({
      success: true,
      data: {
        todayActivity,
        todayBlocked,
        totalActivity,
        totalBlocked,
        topDomains,
        topBlockedCategories,
        totalTimeToday: totalTimeToday[0]?.totalSeconds || 0
      }
    });
  } catch (error) {
    console.error('Parent student stats error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   GET /api/v1/parent/students/:id/activity
router.get(
  '/students/:id/activity',
  [
    param('id').isMongoId(),
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('startDate').optional().isISO8601(),
    query('endDate').optional().isISO8601()
  ],
  validateRequest,
  async (req, res) => {
    try {
      const studentId = req.params.id;
      const link = await ensureLinkedStudent(req.parent, studentId);
      if (link.error) {
        return res.status(403).json({ success: false, message: link.error });
      }

      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 50;
      const skip = (page - 1) * limit;

      const filter = { student: studentId };
      if (req.query.startDate || req.query.endDate) {
        filter.visitTime = {};
        if (req.query.startDate) filter.visitTime.$gte = new Date(req.query.startDate);
        if (req.query.endDate) filter.visitTime.$lte = new Date(req.query.endDate);
      }

      const [activities, total] = await Promise.all([
        Activity.find(filter).sort({ visitTime: -1 }).skip(skip).limit(limit),
        Activity.countDocuments(filter)
      ]);

      res.status(200).json({
        success: true,
        data: activities,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      });
    } catch (error) {
      console.error('Parent student activity error:', error);
      res.status(500).json({ success: false, message: 'Server error' });
    }
  }
);

// @route   POST /api/v1/parent/students/:id/force-logout
router.post(
  '/students/:id/force-logout',
  [param('id').isMongoId()],
  validateRequest,
  async (req, res) => {
  try {
    const studentId = req.params.id;
    const link = await ensureLinkedStudent(req.parent, studentId);
    if (link.error) {
      return res.status(403).json({ success: false, message: link.error });
    }

    const student = await Student.findById(studentId).select('center isActive');
    if (!student) {
      return res.status(404).json({ success: false, message: 'Student not found' });
    }
    if (!student.isActive) {
      return res.status(400).json({ success: false, message: 'Student account is inactive' });
    }

    const command = await AdminCommand.create({
      type: 'FORCE_LOGOUT',
      student: student._id,
      center: student.center,
      scope: 'student',
      payload: null,
      status: 'pending',
      createdByParent: req.parent._id
    });

    const io = req.app.get('io');
    if (io) {
      await dispatchCommands(io, [command]);
    }

    res.status(201).json({ success: true, data: { id: command._id } });
  } catch (error) {
    console.error('Parent force logout error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
  }
);

module.exports = router;
