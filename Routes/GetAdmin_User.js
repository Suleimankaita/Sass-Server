// routes/adminRoutes.js
const express = require('express');
const router = express.Router();
const GetUserCompany = require('../Controllers/GetAdmin_User');
const Verify = require('../Middleware/Verify');

router.get('/',Verify, GetUserCompany);

module.exports = router;
