const express = require('express');
const router = express.Router();
const { body, query, validationResult } = require('express-validator');
const { Student, Center, Activity } = require('../models');
const { protectAdmin, authorize, centerAccess } = require('../middleware/auth');

// All routes require admin authentication
router.use(protectAdmin);

// @route   GET /api/v1/students
// @desc    Get all students (with pagination and filters)
// @access  Admin
router.get('/', [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('center').optional().isMongoId(),
  query('search').optional().isString(),
  query('isActive').optional().isBoolean()
], async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    // Build filter
    const filter = {};

    // Center filter (for non-super admins, auto-filter by their center)
    if (req.admin.role !== 'super_admin' && req.admin.center) {
      filter.center = req.admin.center;
    } else if (req.query.center) {
      filter.center = req.query.center;
    }

    // Search by name or studentId
    if (req.query.search) {
      filter.$or = [
        { name: { $regex: req.query.search, $options: 'i' } },
        { studentId: { $regex: req.query.search, $options: 'i' } }
      ];
    }

    // Active filter
    if (req.query.isActive !== undefined) {
      filter.isActive = req.query.isActive === 'true';
    }

    const [students, total] = await Promise.all([
      Student.find(filter)
        .populate('center', 'name code')
        .select('-pinHash')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Student.countDocuments(filter)
    ]);

    res.status(200).json({
      success: true,
      data: students,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get students error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   GET /api/v1/students/:id
// @desc    Get single student
// @access  Admin
router.get('/:id', async (req, res) => {
  try {
    const student = await Student.findById(req.params.id)
      .populate('center', 'name code city state')
      .select('-pinHash');

    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    // Check center access
    if (req.admin.role !== 'super_admin' && req.admin.center) {
      if (student.center._id.toString() !== req.admin.center.toString()) {
        return res.status(403).json({
          success: false,
          message: 'Not authorized to access this student'
        });
      }
    }

    res.status(200).json({
      success: true,
      data: student
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   POST /api/v1/students
// @desc    Create new student
// @access  Admin
router.post('/', [
  authorize('super_admin', 'admin', 'pod_admin'),
  body('studentId').matches(/^\d{6,8}$/).withMessage('Student ID must be 6-8 digits'),
  body('pin').matches(/^\d{4}$/).withMessage('PIN must be 4 digits'),
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('center').isMongoId().withMessage('Valid center ID is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { studentId, pin, name, email, phone, center, grade, section } = req.body;

    // Check if studentId already exists
    const existingStudent = await Student.findOne({ studentId });
    if (existingStudent) {
      return res.status(400).json({
        success: false,
        message: 'Student ID already exists'
      });
    }

    // Verify center exists
    const centerDoc = await Center.findById(center);
    if (!centerDoc) {
      return res.status(400).json({
        success: false,
        message: 'Center not found'
      });
    }

    // Check center access for non-super admins
    if (req.admin.role !== 'super_admin' && req.admin.center) {
      if (center !== req.admin.center.toString()) {
        return res.status(403).json({
          success: false,
          message: 'Not authorized to add students to this center'
        });
      }
    }

    const student = await Student.create({
      studentId,
      pinHash: pin, // Will be hashed by pre-save hook
      name,
      email,
      phone,
      center,
      grade,
      section
    });

    const populatedStudent = await Student.findById(student._id)
      .populate('center', 'name code')
      .select('-pinHash');

    res.status(201).json({
      success: true,
      data: populatedStudent
    });
  } catch (error) {
    console.error('Create student error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   PUT /api/v1/students/:id
// @desc    Update student
// @access  Admin
router.put('/:id', [
  authorize('super_admin', 'admin', 'pod_admin'),
  body('name').optional().trim().notEmpty(),
  body('email').optional().isEmail(),
  body('center').optional().isMongoId()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const student = await Student.findById(req.params.id);

    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    // Check center access
    if (req.admin.role !== 'super_admin' && req.admin.center) {
      if (student.center.toString() !== req.admin.center.toString()) {
        return res.status(403).json({
          success: false,
          message: 'Not authorized to update this student'
        });
      }
    }

    const { name, email, phone, grade, section, isActive } = req.body;

    if (name) student.name = name;
    if (email !== undefined) student.email = email;
    if (phone !== undefined) student.phone = phone;
    if (grade !== undefined) student.grade = grade;
    if (section !== undefined) student.section = section;
    if (isActive !== undefined) student.isActive = isActive;

    await student.save();

    const updatedStudent = await Student.findById(student._id)
      .populate('center', 'name code')
      .select('-pinHash');

    res.status(200).json({
      success: true,
      data: updatedStudent
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   POST /api/v1/students/:id/reset-pin
// @desc    Reset student PIN
// @access  Admin
router.post('/:id/reset-pin', [
  authorize('super_admin', 'admin', 'pod_admin'),
  body('pin').matches(/^\d{4}$/).withMessage('PIN must be 4 digits')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const student = await Student.findById(req.params.id);

    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    // Check center access
    if (req.admin.role !== 'super_admin' && req.admin.center) {
      if (student.center.toString() !== req.admin.center.toString()) {
        return res.status(403).json({
          success: false,
          message: 'Not authorized'
        });
      }
    }

    student.pinHash = req.body.pin; // Will be hashed by pre-save hook
    await student.save();

    res.status(200).json({
      success: true,
      message: 'PIN reset successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   DELETE /api/v1/students/:id
// @desc    Delete student
// @access  Admin
router.delete('/:id', authorize('super_admin', 'admin'), async (req, res) => {
  try {
    const student = await Student.findById(req.params.id);

    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    await student.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Student deleted'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   GET /api/v1/students/:id/stats
// @desc    Get student statistics
// @access  Admin
router.get('/:id/stats', [
  query('startDate').optional().isISO8601(),
  query('endDate').optional().isISO8601()
], async (req, res) => {
  try {
    const student = await Student.findById(req.params.id);

    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    // Check center access
    if (req.admin.role !== 'super_admin' && req.admin.center) {
      if (student.center.toString() !== req.admin.center.toString()) {
        return res.status(403).json({
          success: false,
          message: 'Not authorized'
        });
      }
    }

    let startDate = req.query.startDate ? new Date(req.query.startDate) : null;
    let endDate = req.query.endDate ? new Date(req.query.endDate) : null;

    if (!startDate && !endDate) {
      startDate = new Date();
      startDate.setHours(0, 0, 0, 0);
    }

    if (endDate && req.query.endDate.length === 10) {
      endDate.setHours(23, 59, 59, 999);
    }

    const rangeFilter = {};
    if (startDate) rangeFilter.$gte = startDate;
    if (endDate) rangeFilter.$lte = endDate;

    const scopedActivityMatch = {
      student: student._id,
      ...(Object.keys(rangeFilter).length > 0 ? { visitTime: rangeFilter } : {})
    };

    const [
      todayActivity,
      todayBlocked,
      totalActivity,
      totalBlocked,
      topDomains,
      topBlockedCategories,
      totalTimeToday
    ] = await Promise.all([
      Activity.countDocuments({
        ...scopedActivityMatch
      }),
      Activity.countDocuments({
        ...scopedActivityMatch,
        wasBlocked: true
      }),
      Activity.countDocuments({ student: student._id }),
      Activity.countDocuments({ student: student._id, wasBlocked: true }),
      Activity.aggregate([
        {
          $match: scopedActivityMatch
        },
        {
          $group: {
            _id: '$domain',
            count: { $sum: 1 },
            totalDuration: { $sum: '$durationSeconds' }
          }
        },
        { $sort: { count: -1 } },
        { $limit: 10 }
      ]),
      Activity.aggregate([
        {
          $match: {
            ...scopedActivityMatch,
            wasBlocked: true
          }
        },
        {
          $group: {
            _id: '$blockCategory',
            count: { $sum: 1 }
          }
        },
        { $sort: { count: -1 } }
      ]),
      Activity.aggregate([
        {
          $match: scopedActivityMatch
        },
        {
          $group: {
            _id: null,
            totalSeconds: { $sum: '$durationSeconds' }
          }
        }
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
        totalTimeToday: totalTimeToday[0]?.totalSeconds || 0,
        rangeStartDate: startDate,
        rangeEndDate: endDate
      }
    });
  } catch (error) {
    console.error('Get student stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   GET /api/v1/students/:id/activity
// @desc    Get student activity history
// @access  Admin
router.get('/:id/activity', [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('startDate').optional().isISO8601(),
  query('endDate').optional().isISO8601()
], async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const skip = (page - 1) * limit;

    const filter = { student: req.params.id };

    if (req.query.startDate || req.query.endDate) {
      filter.visitTime = {};
      if (req.query.startDate) filter.visitTime.$gte = new Date(req.query.startDate);
      if (req.query.endDate) filter.visitTime.$lte = new Date(req.query.endDate);
    }

    const [activities, total] = await Promise.all([
      Activity.find(filter)
        .sort({ visitTime: -1 })
        .skip(skip)
        .limit(limit),
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
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

module.exports = router;
