const express = require('express');
const router = express.Router();
const { body, query, validationResult } = require('express-validator');
const { Center, Student, Activity } = require('../models');
const { protectAdmin, authorize } = require('../middleware/auth');
const { syncCentersFromPms } = require('../services/centerSync.service');

// All routes require admin authentication
router.use(protectAdmin);

// @route   GET /api/v1/centers
// @desc    Get all centers
// @access  Admin
router.get('/', async (req, res) => {
  try {
    let filter = {};

    // Non-super admins can only see their own center
    if (req.admin.role !== 'super_admin' && req.admin.center) {
      filter._id = req.admin.center;
    }

    const centers = await Center.find(filter).sort({ name: 1 });

    // Get student counts for each center
    const centersWithCounts = await Promise.all(
      centers.map(async (center) => {
        const studentCount = await Student.countDocuments({ center: center._id });
        const activeStudentCount = await Student.countDocuments({
          center: center._id,
          isActive: true
        });
        return {
          ...center.toObject(),
          studentCount,
          activeStudentCount
        };
      })
    );

    res.status(200).json({
      success: true,
      data: centersWithCounts
    });
  } catch (error) {
    console.error('Get centers error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   POST /api/v1/centers/sync-pms
// @desc    Sync centers from PMS
// @access  Super Admin only
router.post('/sync-pms', authorize('super_admin'), async (req, res) => {
  try {
    const results = await syncCentersFromPms();

    res.status(200).json({
      success: true,
      data: results
    });
  } catch (error) {
    console.error('Sync PMS centers error:', error);
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Failed to sync centers'
    });
  }
});

// @route   GET /api/v1/centers/:id
// @desc    Get single center
// @access  Admin
router.get('/:id', async (req, res) => {
  try {
    const center = await Center.findById(req.params.id);

    if (!center) {
      return res.status(404).json({
        success: false,
        message: 'Center not found'
      });
    }

    // Check access
    if (req.admin.role !== 'super_admin' && req.admin.center) {
      if (center._id.toString() !== req.admin.center.toString()) {
        return res.status(403).json({
          success: false,
          message: 'Not authorized to access this center'
        });
      }
    }

    // Get counts
    const studentCount = await Student.countDocuments({ center: center._id });
    const activeStudentCount = await Student.countDocuments({
      center: center._id,
      isActive: true
    });

    res.status(200).json({
      success: true,
      data: {
        ...center.toObject(),
        studentCount,
        activeStudentCount
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   POST /api/v1/centers
// @desc    Create new center
// @access  Super Admin only
router.post('/', [
  authorize('super_admin'),
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('code').trim().notEmpty().withMessage('Code is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { name, code, address, city, state, pincode, contactName, contactPhone, contactEmail } = req.body;

    // Check if code already exists
    const existingCenter = await Center.findOne({ code: code.toUpperCase() });
    if (existingCenter) {
      return res.status(400).json({
        success: false,
        message: 'Center code already exists'
      });
    }

    const center = await Center.create({
      name,
      code: code.toUpperCase(),
      address,
      city,
      state,
      pincode,
      contactName,
      contactPhone,
      contactEmail
    });

    res.status(201).json({
      success: true,
      data: center
    });
  } catch (error) {
    console.error('Create center error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   PUT /api/v1/centers/:id
// @desc    Update center
// @access  Super Admin only
router.put('/:id', authorize('super_admin'), async (req, res) => {
  try {
    const center = await Center.findById(req.params.id);

    if (!center) {
      return res.status(404).json({
        success: false,
        message: 'Center not found'
      });
    }

    const { name, address, city, state, pincode, contactName, contactPhone, contactEmail, isActive } = req.body;

    if (name) center.name = name;
    if (address !== undefined) center.address = address;
    if (city !== undefined) center.city = city;
    if (state !== undefined) center.state = state;
    if (pincode !== undefined) center.pincode = pincode;
    if (contactName !== undefined) center.contactName = contactName;
    if (contactPhone !== undefined) center.contactPhone = contactPhone;
    if (contactEmail !== undefined) center.contactEmail = contactEmail;
    if (isActive !== undefined) center.isActive = isActive;

    await center.save();

    res.status(200).json({
      success: true,
      data: center
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   DELETE /api/v1/centers/:id
// @desc    Delete center
// @access  Super Admin only
router.delete('/:id', authorize('super_admin'), async (req, res) => {
  try {
    const center = await Center.findById(req.params.id);

    if (!center) {
      return res.status(404).json({
        success: false,
        message: 'Center not found'
      });
    }

    // Check if center has students
    const studentCount = await Student.countDocuments({ center: center._id });
    if (studentCount > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete center with ${studentCount} students. Remove students first.`
      });
    }

    await center.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Center deleted'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   GET /api/v1/centers/:id/stats
// @desc    Get center statistics
// @access  Admin
router.get('/:id/stats', async (req, res) => {
  try {
    const center = await Center.findById(req.params.id);

    if (!center) {
      return res.status(404).json({
        success: false,
        message: 'Center not found'
      });
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

    const visitTimeFilter = {};
    if (startDate) visitTimeFilter.$gte = startDate;
    if (endDate) visitTimeFilter.$lte = endDate;

    const activityMatch = {
      center: center._id,
      ...(Object.keys(visitTimeFilter).length > 0 ? { visitTime: visitTimeFilter } : {})
    };

    const [
      totalStudents,
      activeStudents,
      todayActivity,
      todayBlocked,
      topDomains
    ] = await Promise.all([
      Student.countDocuments({ center: center._id }),
      Student.countDocuments({ center: center._id, isActive: true }),
      Activity.countDocuments({
        ...activityMatch
      }),
      Activity.countDocuments({
        ...activityMatch,
        wasBlocked: true
      }),
      Activity.aggregate([
        {
          $match: activityMatch
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
      ])
    ]);

    res.status(200).json({
      success: true,
      data: {
        totalStudents,
        activeStudents,
        todayActivity,
        todayBlocked,
        topDomains
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   GET /api/v1/centers/:id/students
// @desc    Get students in a center
// @access  Admin
router.get('/:id/students', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const skip = (page - 1) * limit;

    const [students, total] = await Promise.all([
      Student.find({ center: req.params.id })
        .select('-pinHash')
        .sort({ name: 1 })
        .skip(skip)
        .limit(limit),
      Student.countDocuments({ center: req.params.id })
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
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

module.exports = router;
