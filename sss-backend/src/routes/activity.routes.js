const express = require('express');
const router = express.Router();
const { body, query, validationResult } = require('express-validator');
const mongoose = require('mongoose');
const { Activity, Student, Center } = require('../models');
const { handleError } = require('../utils/error');
const { protectStudent, protectAdmin } = require('../middleware/auth');
const { getCategoryForActivity } = require('../utils/activityCategory');

function parseObjectIdList(rawValue) {
  if (!rawValue) return [];
  const values = Array.isArray(rawValue) ? rawValue : String(rawValue).split(',');
  return values
    .map((value) => String(value).trim())
    .filter(Boolean);
}

function isObjectIdList(rawValue) {
  const ids = parseObjectIdList(rawValue);
  if (ids.length === 0) return false;
  return ids.every((id) => mongoose.Types.ObjectId.isValid(id));
}

// ============================================
// EXTENSION ENDPOINTS (Student Auth)
// ============================================

// @route   POST /api/v1/activity/batch
// @desc    Receive batched activity from extension
// @access  Protected (Session Token)
router.post('/batch', protectStudent, [
  body('entries').isArray({ min: 1 }).withMessage('Entries array is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { entries } = req.body;
    const studentId = req.student._id;
    const centerId = req.student.center._id || req.student.center;

    // Process and validate entries
    const preparedEntries = entries
      .filter(entry => entry.url && entry.visitTime)
      .map(entry => ({
        student: studentId,
        center: centerId,
        url: entry.url,
        domain: entry.domain || extractDomain(entry.url),
        title: entry.title || '',
        favicon: entry.favicon,
        visitTime: new Date(entry.visitTime),
        durationSeconds: entry.durationSeconds || 0,
        idleSeconds: entry.idleSeconds || 0,
        wasBlocked: entry.wasBlocked || false,
        blockReason: entry.blockReason,
        blockCategory: entry.blockCategory
      }));

    const validEntries = await Promise.all(
      preparedEntries.map(async (entry) => ({
        ...entry,
        category: await getCategoryForActivity({ url: entry.url, domain: entry.domain })
      }))
    );

    if (validEntries.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No valid entries'
      });
    }

    // Bulk insert
    await Activity.insertMany(validEntries);

    // Emit real-time event (if socket.io is set up)
    const io = req.app.get('io');
    if (io) {
      validEntries.forEach(entry => {
        io.to(`center:${centerId}`).emit('activity', {
          ...entry,
          studentName: req.student.name,
          studentId: req.student.studentId
        });

        // Emit blocked attempts as alerts
        if (entry.wasBlocked) {
          io.to('alerts').emit('blocked_attempt', {
            ...entry,
            studentName: req.student.name,
            studentId: req.student.studentId,
            centerName: req.student.center.name
          });
        }
      });
    }

    res.status(200).json({
      success: true,
      data: {
        received: entries.length,
        processed: validEntries.length
      }
    });
  } catch (error) {
    console.error('Activity batch error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// ============================================
// ADMIN ENDPOINTS (Dashboard)
// ============================================

// @route   GET /api/v1/activity
// @desc    Get activity logs (for dashboard)
// @access  Admin
router.get('/', protectAdmin, [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('center').optional().custom(isObjectIdList),
  query('student').optional().custom(isObjectIdList),
  query('domain').optional().isString(),
  query('startDate').optional().isISO8601(),
  query('endDate').optional().isISO8601(),
  query('wasBlocked').optional().isBoolean(),
  query('category').optional().isString()
], async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const skip = (page - 1) * limit;

    // Build filter
    const filter = {};

    const centerIds = parseObjectIdList(req.query.center);
    const studentIds = parseObjectIdList(req.query.student);

    // Center filter
    if (req.admin.role !== 'super_admin' && req.admin.center) {
      filter.center = req.admin.center;
    } else if (centerIds.length > 0) {
      filter.center = centerIds.length === 1 ? centerIds[0] : { $in: centerIds };
    }

    // Student filter
    if (studentIds.length > 0) {
      filter.student = studentIds.length === 1 ? studentIds[0] : { $in: studentIds };
    }

    // Domain filter
    if (req.query.domain) {
      filter.domain = { $regex: req.query.domain, $options: 'i' };
    }

    // Date range
    if (req.query.startDate || req.query.endDate) {
      filter.visitTime = {};
      if (req.query.startDate) filter.visitTime.$gte = new Date(req.query.startDate);
      if (req.query.endDate) filter.visitTime.$lte = new Date(req.query.endDate);
    }

    // Blocked filter
    if (req.query.wasBlocked !== undefined) {
      filter.wasBlocked = req.query.wasBlocked === 'true';
    }

    // Category filter
    if (req.query.category) {
      filter.category = req.query.category;
    }


    const [activities, total] = await Promise.all([
      Activity.find(filter)
        .populate('student', 'studentId name')
        .populate('center', 'name code')
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
    console.error('Get activity error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   GET /api/v1/activity/blocked
// @desc    Get blocked attempts
// @access  Admin
router.get('/blocked', protectAdmin, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const skip = (page - 1) * limit;

    const filter = { wasBlocked: true };

    if (req.admin.role !== 'super_admin' && req.admin.center) {
      filter.center = req.admin.center;
    } else if (req.query.center) {
      filter.center = req.query.center;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    filter.visitTime = { $gte: today };

    const [blockedAttempts, total] = await Promise.all([
      Activity.find(filter)
        .populate('student', 'studentId name')
        .populate('center', 'name code')
        .sort({ visitTime: -1 })
        .skip(skip)
        .limit(limit),
      Activity.countDocuments(filter)
    ]);

    res.status(200).json({
      success: true,
      data: blockedAttempts,
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

// @route   GET /api/v1/activity/state-summary
// @desc    Get activity summary by state
// @access  Admin
router.get('/state-summary', protectAdmin, [
  query('startDate').optional().isISO8601(),
  query('endDate').optional().isISO8601(),
  query('center').optional().custom(isObjectIdList),
  query('student').optional().custom(isObjectIdList),
  query('category').optional().isString()
], async (req, res) => {
  try {
    const hasCustomRange = Boolean(req.query.startDate || req.query.endDate);
    let startDate = req.query.startDate ? new Date(req.query.startDate) : null;
    let endDate = req.query.endDate ? new Date(req.query.endDate) : null;

    if (endDate && req.query.endDate.length === 10) {
      endDate.setHours(23, 59, 59, 999);
    }

    if (!hasCustomRange) {
      startDate = new Date();
      startDate.setHours(0, 0, 0, 0);
    }

    const dateFilter = {};
    if (startDate) dateFilter.$gte = startDate;
    if (endDate) dateFilter.$lte = endDate;

    const filter = Object.keys(dateFilter).length ? { visitTime: dateFilter } : {};

    const centerIds = parseObjectIdList(req.query.center);
    const studentIds = parseObjectIdList(req.query.student);

    if (req.admin.role !== 'super_admin' && req.admin.center) {
      filter.center = req.admin.center;
    } else if (centerIds.length > 0) {
      filter.center = centerIds.length === 1 ? centerIds[0] : { $in: centerIds };
    }

    if (studentIds.length > 0) {
      filter.student = studentIds.length === 1 ? studentIds[0] : { $in: studentIds };
    }

    if (req.query.category) {
      filter.category = req.query.category;
    }

    const stateSummaries = await Activity.aggregate([
      { $match: filter },
      {
        $lookup: {
          from: 'centers',
          localField: 'center',
          foreignField: '_id',
          as: 'center'
        }
      },
      { $unwind: '$center' },
      {
        $group: {
          _id: { $ifNull: ['$center.state', 'Unknown'] },
          totalDuration: { $sum: '$durationSeconds' },
          totalIdleSeconds: { $sum: '$idleSeconds' },
          totalVisits: { $sum: 1 }
        }
      },
      {
        $project: {
          _id: 0,
          state: '$_id',
          totalDuration: 1,
          totalIdleSeconds: 1,
          totalVisits: 1,
          totalTimeSeconds: { $add: ['$totalDuration', '$totalIdleSeconds'] }
        }
      },
      { $sort: { totalDuration: -1 } }
    ]);

    res.status(200).json({
      success: true,
      data: stateSummaries
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   GET /api/v1/activity/stats
// @desc    Get activity statistics
// @access  Admin
router.get('/stats', protectAdmin, [
  query('startDate').optional().isISO8601(),
  query('endDate').optional().isISO8601(),
  query('state').optional().isString(),
  query('center').optional().custom(isObjectIdList),
  query('student').optional().custom(isObjectIdList),
  query('category').optional().isString(),
  query('websiteRankBy').optional().isIn(['visits', 'time'])
], async (req, res) => {
  try {
    const websiteRankBy = req.query.websiteRankBy === 'time' ? 'time' : 'visits';
    const hasCustomRange = Boolean(req.query.startDate || req.query.endDate);
    let startDate = req.query.startDate ? new Date(req.query.startDate) : null;
    let endDate = req.query.endDate ? new Date(req.query.endDate) : null;

    if (endDate && req.query.endDate.length === 10) {
      endDate.setHours(23, 59, 59, 999);
    }

    if (!hasCustomRange) {
      startDate = new Date();
      startDate.setHours(0, 0, 0, 0);
    }

    const dateFilter = {};
    if (startDate) dateFilter.$gte = startDate;
    if (endDate) dateFilter.$lte = endDate;

    const filter = Object.keys(dateFilter).length ? { visitTime: dateFilter } : {};

    const centerIds = parseObjectIdList(req.query.center);
    const studentIds = parseObjectIdList(req.query.student);

    if (req.admin.role !== 'super_admin' && req.admin.center) {
      filter.center = req.admin.center;
    } else if (centerIds.length > 0) {
      filter.center = centerIds.length === 1 ? centerIds[0] : { $in: centerIds };
    }

    if (studentIds.length > 0) {
      filter.student = studentIds.length === 1 ? studentIds[0] : { $in: studentIds };
    }

    if (req.query.category) {
      filter.category = req.query.category;
    }

    const studentFilter = {};
    if (req.admin.role !== 'super_admin' && req.admin.center) {
      studentFilter.center = req.admin.center;
    } else if (centerIds.length > 0) {
      studentFilter.center = centerIds.length === 1 ? centerIds[0] : { $in: centerIds };
    }

    if (studentIds.length > 0) {
      studentFilter._id = studentIds.length === 1 ? studentIds[0] : { $in: studentIds };
    }

    if (req.query.state) {
      const stateCenters = await Center.find({ state: req.query.state }).select('_id');
      const stateCenterIds = stateCenters.map((center) => center._id.toString());

      const scopedCenterIds = (() => {
        if (!filter.center) return stateCenterIds;

        if (typeof filter.center === 'string') {
          return stateCenterIds.includes(filter.center) ? [filter.center] : [];
        }

        if (filter.center.$in) {
          const selected = filter.center.$in.map((id) => id.toString());
          return selected.filter((id) => stateCenterIds.includes(id));
        }

        const single = filter.center.toString();
        return stateCenterIds.includes(single) ? [single] : [];
      })();

      filter.center = { $in: scopedCenterIds };
      studentFilter.center = { $in: scopedCenterIds };
    }

    const [
      totalToday,
      blockedToday,
      topDomains,
      topBlockedCategories,
      totalActiveTime,
      topPods,
      scopedStudents,
      activeStudentIds
    ] = await Promise.all([
      Activity.countDocuments(filter),
      Activity.countDocuments({ ...filter, wasBlocked: true }),
      Activity.aggregate([
        { $match: filter },
        {
          $group: {
            _id: '$domain',
            count: { $sum: 1 },
            totalDuration: { $sum: '$durationSeconds' }
          }
        },
        {
          $sort: websiteRankBy === 'time'
            ? { totalDuration: -1, count: -1, _id: 1 }
            : { count: -1, totalDuration: -1, _id: 1 }
        },
        { $limit: 10 }
      ]),
      Activity.aggregate([
        { $match: { ...filter, wasBlocked: true } },
        {
          $group: {
            _id: '$blockCategory',
            count: { $sum: 1 }
          }
        },
        { $sort: { count: -1 } }
      ]),
      Activity.aggregate([
        { $match: filter },
        {
          $group: {
            _id: null,
            totalSeconds: { $sum: '$durationSeconds' },
            totalIdleSeconds: { $sum: '$idleSeconds' }
          }
        }
      ]),
      Activity.aggregate([
        { $match: filter },
        {
          $group: {
            _id: '$center',
            totalDuration: { $sum: '$durationSeconds' },
            totalIdleSeconds: { $sum: '$idleSeconds' },
            totalVisits: { $sum: 1 }
          }
        },
        { $sort: { totalDuration: -1 } },
        { $limit: 10 },
        {
          $lookup: {
            from: 'centers',
            localField: '_id',
            foreignField: '_id',
            as: 'center'
          }
        },
        { $unwind: { path: '$center', preserveNullAndEmptyArrays: true } },
        {
          $project: {
            _id: 1,
            name: '$center.name',
            code: '$center.code',
            state: '$center.state',
            totalDuration: 1,
            totalIdleSeconds: 1,
            totalVisits: 1
          }
        },
        ...(req.query.state ? [{ $match: { state: req.query.state } }] : [])
      ]),
      Student.find(studentFilter).select('_id'),
      Activity.distinct('student', filter)
    ]);

    const scopedStudentIdSet = new Set(scopedStudents.map((student) => student._id.toString()));
    const totalUsers = scopedStudentIdSet.size;
    const totalActiveUsers = activeStudentIds.reduce((count, studentId) => {
      return scopedStudentIdSet.has(studentId.toString()) ? count + 1 : count;
    }, 0);
    const totalInactiveUsers = Math.max(totalUsers - totalActiveUsers, 0);

    const totalActiveSeconds = totalActiveTime[0]?.totalSeconds || 0;
    const totalIdleSeconds = totalActiveTime[0]?.totalIdleSeconds || 0;

    res.status(200).json({
      success: true,
      data: {
        totalToday,
        blockedToday,
        topDomains,
        topBlockedCategories,
        totalTimeSeconds: totalActiveSeconds + totalIdleSeconds,
        totalActiveSeconds,
        totalIdleSeconds,
        totalUsers,
        totalActiveUsers,
        totalInactiveUsers,
        websiteRankBy,
        topPods
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   GET /api/v1/activity/recent
// @desc    Get recent activity entries
// @access  Admin
router.get('/recent', protectAdmin, [
  query('limit').optional().isInt({ min: 1, max: 100 })
], async (req, res) => {
  try {
    const limit = parseInt(req.query.limit, 10) || 10;
    const filter = {};

    if (req.admin.role !== 'super_admin' && req.admin.center) {
      filter.center = req.admin.center;
    } else if (req.query.center) {
      filter.center = req.query.center;
    }

    const activities = await Activity.find(filter)
      .populate('student', 'studentId name')
      .populate('center', 'name code')
      .sort({ visitTime: -1 })
      .limit(limit);

    res.status(200).json({
      success: true,
      data: activities
    });
  } catch (error) {
    handleError(res, error, 'Failed to load recent activity');
  }
});

// Helper function to extract domain from URL
function extractDomain(url) {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname;
  } catch {
    return url;
  }
}

module.exports = router;
