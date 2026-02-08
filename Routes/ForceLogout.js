const express = require('express');
const router = express.Router();
const { LogOut } = require('../Controllers/ForceLogout');
const verify = require('../Middleware/Verify');

// Single User Logout
router.route('/')
.post(LogOut);

// Logout All Users (excluding SuperAdmin) - Admin only
// router.post('/logoutall', verify, LogOutAll);

module.exports = router;
