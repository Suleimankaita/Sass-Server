// routes/adminRoutes.js
const express = require('express');
const router = express.Router();
const GetAdminCompany = require('../Controllers/GetAdminCompany');
const Verify = require('../Middleware/Verify');
router.get('/',Verify, GetAdminCompany);

module.exports = router;
