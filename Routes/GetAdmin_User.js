// routes/adminRoutes.js
const express = require('express');
const router = express.Router();
const GetUserCompany = require('../Controllers/GetAdmin_User');

router.get('/', GetUserCompany);

module.exports = router;
