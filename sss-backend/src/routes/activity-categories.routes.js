const express = require('express');
const { body, query, validationResult } = require('express-validator');
const { ActivityCategory, ActivityCategoryRule } = require('../models');
const { protectAdmin } = require('../middleware/auth');
const { handleError } = require('../utils/error');

const router = express.Router();

router.get('/', protectAdmin, [
  query('isActive').optional().isBoolean()
], async (req, res) => {
  try {
    const filter = {};
    if (req.query.isActive !== undefined) {
      filter.isActive = req.query.isActive === 'true';
    }

    const categories = await ActivityCategory.find(filter).sort({ name: 1 });
    res.status(200).json({ success: true, data: categories });
  } catch (error) {
    handleError(res, error, 'Failed to fetch activity categories');
  }
});

router.post('/', protectAdmin, [
  body('name').isString().notEmpty(),
  body('description').optional().isString(),
  body('color').optional().isString(),
  body('isActive').optional().isBoolean()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { name, description, color, isActive } = req.body;
    const existing = await ActivityCategory.findOne({ name });
    if (existing) {
      return res.status(409).json({ success: false, message: 'Category already exists' });
    }

    const category = await ActivityCategory.create({
      name: name.trim(),
      description,
      color,
      isActive: isActive !== undefined ? isActive : true
    });

    res.status(201).json({ success: true, data: category });
  } catch (error) {
    handleError(res, error, 'Failed to create activity category');
  }
});

router.put('/:id', protectAdmin, [
  body('name').optional().isString().notEmpty(),
  body('description').optional().isString(),
  body('color').optional().isString(),
  body('isActive').optional().isBoolean()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const category = await ActivityCategory.findById(req.params.id);
    if (!category) {
      return res.status(404).json({ success: false, message: 'Category not found' });
    }

    const { name, description, color, isActive } = req.body;
    if (name && name !== category.name) {
      const existing = await ActivityCategory.findOne({ name });
      if (existing) {
        return res.status(409).json({ success: false, message: 'Category already exists' });
      }
      category.name = name.trim();
    }

    if (description !== undefined) category.description = description;
    if (color !== undefined) category.color = color;
    if (isActive !== undefined) category.isActive = isActive;

    await category.save();

    res.status(200).json({ success: true, data: category });
  } catch (error) {
    handleError(res, error, 'Failed to update activity category');
  }
});

router.delete('/:id', protectAdmin, async (req, res) => {
  try {
    const category = await ActivityCategory.findByIdAndDelete(req.params.id);
    if (!category) {
      return res.status(404).json({ success: false, message: 'Category not found' });
    }

    await ActivityCategoryRule.deleteMany({ category: req.params.id });

    res.status(200).json({ success: true, message: 'Category deleted' });
  } catch (error) {
    handleError(res, error, 'Failed to delete activity category');
  }
});

module.exports = router;
