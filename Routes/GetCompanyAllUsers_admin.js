// routes/adminRoutes.js
const express = require('express');
const router = express.Router();
const GetUserCompany = require('../Controllers/GetAdmin_AllUserCompany');

router.get('/', GetUserCompany);

module.exports = router;
