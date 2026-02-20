const express = require('express');
const router = express.Router();
const { protectAdmin } = require('../middleware/auth');
const adminController = require('../controllers/admin.controller');

router.use(protectAdmin);

router.get('/', adminController.getAdmins);
router.get('/:id', adminController.getAdmin);
router.post('/', adminController.createAdmin);
router.put('/:id', adminController.updateAdmin);
router.delete('/:id', adminController.deleteAdmin);

module.exports = router;