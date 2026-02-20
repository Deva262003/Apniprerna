const express = require('express');
const { body, validationResult } = require('express-validator');
const { protectAdmin, authorize } = require('../middleware/auth');
const commandController = require('../controllers/admin.commands.controller');

const router = express.Router();

router.use(protectAdmin);

router.get('/', commandController.getCommands);
router.get('/:id', commandController.getCommand);

router.post(
  '/',
  authorize('super_admin', 'admin', 'pod_admin'),
  [
    body('type').isIn(['FORCE_LOGOUT', 'SYNC_BLOCKLIST']).withMessage('Invalid command type'),
    body('targetType').isIn(['student', 'center', 'all']).withMessage('Invalid target type'),
    body('targetId').optional().isMongoId().withMessage('Invalid target id')
  ],
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }
    next();
  },
  commandController.createCommand
);

router.post(
  '/:id/execute',
  authorize('super_admin', 'admin', 'pod_admin'),
  commandController.executeCommand
);

module.exports = router;
