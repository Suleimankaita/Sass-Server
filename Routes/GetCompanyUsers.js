const express = require('express');
const router = express.Router();
const { GetStaffMembers } = require('../Controllers/GetCompanyUsers');
const Verify = require('../Middleware/Verify');

// Route to get users
// Example: GET /api/staff?type=branch&targetId=64fb...
router.get('/', Verify, GetStaffMembers);

module.exports = router;