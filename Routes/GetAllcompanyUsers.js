const express = require('express');
const router = express.Router();
const { GetAdminTotalStaff } = require('../Controllers/GetAllCompanyUsers');
const Verify = require('../Middleware/Verify');

// Route to get users
// Example: GET /api/staff?type=branch&targetId=64fb...
router.get('/', Verify, GetAdminTotalStaff);

module.exports = router;