const express = require('express');
const router = express.Router();
const BlockedSite = require('../models/BlockedSite');
const Center = require('../models/Center');
const Student = require('../models/Student');

// Get all blocked sites with filters
router.get('/', async (req, res) => {
  try {
    const { scope, category, isActive, search } = req.query;

    const filter = {};
    if (scope) filter.scope = scope;
    if (category) filter.category = category;
    if (isActive !== undefined) filter.isActive = isActive === 'true';
    if (search) {
      filter.$or = [
        { pattern: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    const blockedSites = await BlockedSite.find(filter)
      .populate('scopeId', 'name code studentCode')
      .sort({ createdAt: -1 });

    res.json({ success: true, data: blockedSites });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get blocked site by ID
router.get('/:id', async (req, res) => {
  try {
    const blockedSite = await BlockedSite.findById(req.params.id)
      .populate('scopeId', 'name code studentCode');

    if (!blockedSite) {
      return res.status(404).json({ success: false, error: 'Blocked site not found' });
    }

    res.json({ success: true, data: blockedSite });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Create blocked site
router.post('/', async (req, res) => {
  try {
    const { pattern, patternType, category, scope, scopeId, description } = req.body;

    // Validate scope and scopeId
    if (scope === 'center' && scopeId) {
      const center = await Center.findById(scopeId);
      if (!center) {
        return res.status(400).json({ success: false, error: 'Center not found' });
      }
    } else if (scope === 'student' && scopeId) {
      const student = await Student.findById(scopeId);
      if (!student) {
        return res.status(400).json({ success: false, error: 'Student not found' });
      }
    }

    const blockedSite = new BlockedSite({
      pattern,
      patternType: patternType || 'domain',
      category: category || 'custom',
      scope: scope || 'global',
      scopeId: scope !== 'global' ? scopeId : undefined,
      scopeModel: scope === 'center' ? 'Center' : scope === 'student' ? 'Student' : undefined,
      description,
      isActive: true
    });

    await blockedSite.save();

    // Populate the scopeId before returning
    await blockedSite.populate('scopeId', 'name code studentCode');

    res.status(201).json({ success: true, data: blockedSite });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Update blocked site
router.put('/:id', async (req, res) => {
  try {
    const { pattern, patternType, category, scope, scopeId, description, isActive } = req.body;

    const blockedSite = await BlockedSite.findById(req.params.id);
    if (!blockedSite) {
      return res.status(404).json({ success: false, error: 'Blocked site not found' });
    }

    // Update fields
    if (pattern) blockedSite.pattern = pattern;
    if (patternType) blockedSite.patternType = patternType;
    if (category) blockedSite.category = category;
    if (description !== undefined) blockedSite.description = description;
    if (isActive !== undefined) blockedSite.isActive = isActive;

    // Update scope
    if (scope) {
      blockedSite.scope = scope;
      if (scope === 'global') {
        blockedSite.scopeId = undefined;
        blockedSite.scopeModel = undefined;
      } else if (scopeId) {
        blockedSite.scopeId = scopeId;
        blockedSite.scopeModel = scope === 'center' ? 'Center' : 'Student';
      }
    }

    await blockedSite.save();
    await blockedSite.populate('scopeId', 'name code studentCode');

    res.json({ success: true, data: blockedSite });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Delete blocked site
router.delete('/:id', async (req, res) => {
  try {
    const blockedSite = await BlockedSite.findByIdAndDelete(req.params.id);

    if (!blockedSite) {
      return res.status(404).json({ success: false, error: 'Blocked site not found' });
    }

    res.json({ success: true, message: 'Blocked site deleted' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Toggle blocked site active status
router.patch('/:id/toggle', async (req, res) => {
  try {
    const blockedSite = await BlockedSite.findById(req.params.id);

    if (!blockedSite) {
      return res.status(404).json({ success: false, error: 'Blocked site not found' });
    }

    blockedSite.isActive = !blockedSite.isActive;
    await blockedSite.save();
    await blockedSite.populate('scopeId', 'name code studentCode');

    res.json({ success: true, data: blockedSite });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Bulk import blocked sites
router.post('/bulk', async (req, res) => {
  try {
    const { sites, scope, scopeId, category } = req.body;

    if (!sites || !Array.isArray(sites)) {
      return res.status(400).json({ success: false, error: 'Sites array is required' });
    }

    const blockedSites = sites.map(site => ({
      pattern: typeof site === 'string' ? site : site.pattern,
      patternType: site.patternType || 'domain',
      category: site.category || category || 'custom',
      scope: scope || 'global',
      scopeId: scope !== 'global' ? scopeId : undefined,
      scopeModel: scope === 'center' ? 'Center' : scope === 'student' ? 'Student' : undefined,
      description: site.description,
      isActive: true
    }));

    const result = await BlockedSite.insertMany(blockedSites, { ordered: false });

    res.status(201).json({
      success: true,
      data: result,
      message: `${result.length} sites added to blocklist`
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get blocklist stats
router.get('/stats/summary', async (req, res) => {
  try {
    const stats = await BlockedSite.aggregate([
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          active: { $sum: { $cond: ['$isActive', 1, 0] } },
          global: { $sum: { $cond: [{ $eq: ['$scope', 'global'] }, 1, 0] } },
          center: { $sum: { $cond: [{ $eq: ['$scope', 'center'] }, 1, 0] } },
          student: { $sum: { $cond: [{ $eq: ['$scope', 'student'] }, 1, 0] } }
        }
      }
    ]);

    const categoryStats = await BlockedSite.aggregate([
      { $match: { isActive: true } },
      { $group: { _id: '$category', count: { $sum: 1 } } }
    ]);

    res.json({
      success: true,
      data: {
        summary: stats[0] || { total: 0, active: 0, global: 0, center: 0, student: 0 },
        byCategory: categoryStats
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
