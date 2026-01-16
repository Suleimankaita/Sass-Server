const express = require('express');
const router = express();
const { LogOut, LogOutAll } = require('../Controllers/LogOut');
const verify = require('../Middleware/Verify');

// Single User Logout
router.route('/')
.post(verify, LogOutAll);

module.exports = router;
