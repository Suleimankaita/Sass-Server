// routes/userAccessRoutes.js
const express = require('express');
const router = express.Router();
const userAccessController = require('../Controllers/AllUsers');
// const { authenticate, authorize } = require('../middleware/auth');

// Apply authentication middleware to all routes
// router.use(authenticate);

// GET all users (requires admin access)
router.get('/',  userAccessController.getAllUsers);

// GET user by ID
router.get('/:id',  userAccessController.getUserById);

// POST create new user
router.post('/',  userAccessController.createUser);

// PUT update user role
router.put('/:id/role',  userAccessController.updateUserRole);

// PUT update user status
router.put('/:id/status',  userAccessController.updateUserStatus);

// POST force logout user
router.post('/:id/force-logout',  userAccessController.forceLogoutUser);

// DELETE user (with confirmation)
router.delete('/:id',  userAccessController.deleteUser);

// GET user activity logs
router.get('/:id/logs', userAccessController.getUserActivityLogs);

// GET platform statistics
router.get('/stats/overview', userAccessController.getPlatformStatistics);

// GET search users
router.get('/search/users', userAccessController.searchUsers);

module.exports = router;