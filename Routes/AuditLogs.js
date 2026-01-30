// routes/activityRoutes.js
const express = require('express');
const router = express.Router();
const activityController = require('../Controllers/AuditLogs');
const Verify = require('../Middleware/Verify');
// const { authenticate, authorize } = require('../middleware/auth');

// Public routes
router.post('/', activityController.createUserActivity);
router.get('/', activityController.getActivities);
router.get('/stats', activityController.getActivityStats);
router.get('/export', activityController.exportActivities);
router.get('/filters', activityController.getFilterOptions);

// Protected routes (admin only)
router.get('/:id', activityController.getActivityById);
router.delete('/:id',  activityController.deleteActivity);

module.exports = router;