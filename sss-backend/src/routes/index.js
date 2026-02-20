const express = require('express');
const router = express.Router();

const authRoutes = require('./auth.routes');
const studentsRoutes = require('./students.routes');
const centersRoutes = require('./centers.routes');
const activityRoutes = require('./activity.routes');
const activityCategoriesRoutes = require('./activity-categories.routes');
const activityCategoryRulesRoutes = require('./activity-category-rules.routes');
const extensionRoutes = require('./extension.routes');
const extensionUpdatesRoutes = require('./extension-updates.routes');
const blocklistRoutes = require('./blocklist.routes');
const adminsRoutes = require('./admins.routes');
const policiesRoutes = require('./policies.routes');
const adminCommandsRoutes = require('./admin.commands.routes');
const parentsRoutes = require('./parents.routes');
const parentRoutes = require('./parent.routes');
const searchRoutes = require('./search.routes');


// Mount routes
router.use('/auth', authRoutes);
router.use('/students', studentsRoutes);
router.use('/centers', centersRoutes);
router.use('/activity', activityRoutes);
router.use('/activity-categories', activityCategoriesRoutes);
router.use('/activity-category-rules', activityCategoryRulesRoutes);
router.use('/extension', extensionUpdatesRoutes); // Public update endpoints (must be before auth-protected routes)
router.use('/extension', extensionRoutes);        // Auth-protected extension endpoints
router.use('/blocklist', blocklistRoutes);
router.use('/admins', adminsRoutes);
router.use('/policies', policiesRoutes);
router.use('/admin/commands', adminCommandsRoutes);
router.use('/parents', parentsRoutes);
router.use('/parent', parentRoutes);
router.use('/search', searchRoutes);


// Health check
router.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'API is running',
    timestamp: new Date()
  });
});

module.exports = router;
