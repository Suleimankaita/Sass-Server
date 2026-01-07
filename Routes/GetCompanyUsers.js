const express = require('express');
const router = express.Router();
const GetCompanyStaff  = require('../Controllers/GetCompanyUsers');
const Verify = require('../Middleware/Verify');

// Route to get users
// Example: GET /api/staff?type=branch&targetId=64fb...
router.get('/', Verify, GetCompanyStaff);

module.exports = router;