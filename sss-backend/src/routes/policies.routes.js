const express = require('express');
const { body, validationResult } = require('express-validator');
const { protectAdmin } = require('../middleware/auth');
const policyController = require('../controllers/policy.controller');

const router = express.Router();

router.use(protectAdmin);

router.get('/', policyController.listPolicies);
router.get('/:id', policyController.getPolicy);

router.post(
  '/',
  [
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('policyType')
      .isIn(['blocklist', 'allowlist', 'time_restriction'])
      .withMessage('Invalid policy type'),
    body('scope')
      .isIn(['global', 'center', 'student'])
      .withMessage('Invalid scope'),
    body('rules').notEmpty().withMessage('Rules are required')
  ],
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }
    next();
  },
  policyController.createPolicy
);

router.put('/:id', policyController.updatePolicy);
router.delete('/:id', policyController.deletePolicy);
router.patch('/:id/toggle', policyController.togglePolicy);

module.exports = router;
