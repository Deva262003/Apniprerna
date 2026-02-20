const express = require('express');
const { body, query, validationResult } = require('express-validator');
const { ActivityCategoryRule, ActivityCategory } = require('../models');
const { protectAdmin } = require('../middleware/auth');
const { handleError } = require('../utils/error');

const router = express.Router();

router.get('/', protectAdmin, [
  query('category').optional().isMongoId(),
  query('isActive').optional().isBoolean()
], async (req, res) => {
  try {
    const filter = {};
    if (req.query.category) filter.category = req.query.category;
    if (req.query.isActive !== undefined) filter.isActive = req.query.isActive === 'true';

    const rules = await ActivityCategoryRule.find(filter)
      .populate('category', 'name color')
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, data: rules });
  } catch (error) {
    handleError(res, error, 'Failed to fetch activity category rules');
  }
});

router.post('/', protectAdmin, [
  body('category').isMongoId(),
  body('pattern').isString().notEmpty(),
  body('patternType').optional().isIn(['domain', 'url', 'regex']),
  body('isActive').optional().isBoolean()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const category = await ActivityCategory.findById(req.body.category);
    if (!category) {
      return res.status(400).json({ success: false, message: 'Category not found' });
    }

    const rule = await ActivityCategoryRule.create({
      category: req.body.category,
      pattern: req.body.pattern.trim(),
      patternType: req.body.patternType || 'domain',
      isActive: req.body.isActive !== undefined ? req.body.isActive : true,
      createdBy: req.admin._id
    });

    await rule.populate('category', 'name color');

    res.status(201).json({ success: true, data: rule });
  } catch (error) {
    handleError(res, error, 'Failed to create activity category rule');
  }
});

router.put('/:id', protectAdmin, [
  body('category').optional().isMongoId(),
  body('pattern').optional().isString().notEmpty(),
  body('patternType').optional().isIn(['domain', 'url', 'regex']),
  body('isActive').optional().isBoolean()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const rule = await ActivityCategoryRule.findById(req.params.id);
    if (!rule) {
      return res.status(404).json({ success: false, message: 'Rule not found' });
    }

    if (req.body.category) {
      const category = await ActivityCategory.findById(req.body.category);
      if (!category) {
        return res.status(400).json({ success: false, message: 'Category not found' });
      }
      rule.category = req.body.category;
    }

    if (req.body.pattern) rule.pattern = req.body.pattern.trim();
    if (req.body.patternType) rule.patternType = req.body.patternType;
    if (req.body.isActive !== undefined) rule.isActive = req.body.isActive;

    await rule.save();
    await rule.populate('category', 'name color');

    res.status(200).json({ success: true, data: rule });
  } catch (error) {
    handleError(res, error, 'Failed to update activity category rule');
  }
});

router.delete('/:id', protectAdmin, async (req, res) => {
  try {
    const rule = await ActivityCategoryRule.findByIdAndDelete(req.params.id);
    if (!rule) {
      return res.status(404).json({ success: false, message: 'Rule not found' });
    }

    res.status(200).json({ success: true, message: 'Rule deleted' });
  } catch (error) {
    handleError(res, error, 'Failed to delete activity category rule');
  }
});

module.exports = router;
