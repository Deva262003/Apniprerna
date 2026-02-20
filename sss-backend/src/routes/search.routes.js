const express = require('express');
const { query, validationResult } = require('express-validator');

const { Student, Center, Parent, Admin } = require('../models');
const { protectAdmin } = require('../middleware/auth');

const router = express.Router();

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

router.use(protectAdmin);

// @route   GET /api/v1/search
// @desc    Universal search across entities for dashboard
// @access  Protected (JWT)
router.get(
  '/',
  [
    query('query').optional().isString(),
    query('q').optional().isString(),
    query('limit').optional().isInt({ min: 1, max: 20 })
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }

      const raw = String(req.query.query || req.query.q || '').trim();
      const limit = Math.min(parseInt(req.query.limit, 10) || 5, 20);

      if (raw.length < 2) {
        return res.status(200).json({
          success: true,
          data: {
            query: raw,
            results: {
              students: [],
              centers: [],
              parents: [],
              admins: []
            }
          }
        });
      }

      const safe = escapeRegex(raw.slice(0, 64));
      const rx = new RegExp(safe, 'i');

      const centerScoped = req.admin.role !== 'super_admin' && !!req.admin.center;

      const studentFilter = {
        ...(centerScoped ? { center: req.admin.center } : {}),
        $or: [{ name: rx }, { studentId: rx }]
      };

      const centerFilter = {
        ...(centerScoped ? { _id: req.admin.center } : {}),
        $or: [{ name: rx }, { code: rx }]
      };

      const parentFilter = {
        ...(centerScoped ? { center: req.admin.center } : {}),
        $or: [{ name: rx }, { parentId: rx }]
      };

      const adminFilter = {
        ...(req.admin.role === 'pod_admin' && req.admin.center ? { center: req.admin.center } : {}),
        $or: [{ name: rx }, { email: rx }]
      };

      const [students, centers, parents, admins] = await Promise.all([
        Student.find(studentFilter)
          .select('name studentId center isActive')
          .populate('center', 'name code')
          .sort({ createdAt: -1 })
          .limit(limit),
        Center.find(centerFilter)
          .select('name code city state isActive')
          .sort({ name: 1 })
          .limit(limit),
        Parent.find(parentFilter)
          .select('name parentId parentIdType center isActive')
          .populate('center', 'name code')
          .sort({ createdAt: -1 })
          .limit(limit),
        Admin.find(adminFilter)
          .select('name email role center isActive')
          .populate('center', 'name code')
          .sort({ createdAt: -1 })
          .limit(limit)
      ]);

      return res.status(200).json({
        success: true,
        data: {
          query: raw,
          results: {
            students,
            centers,
            parents,
            admins
          }
        }
      });
    } catch (error) {
      console.error('Universal search error:', error);
      return res.status(500).json({ success: false, message: 'Server error' });
    }
  }
);

module.exports = router;
