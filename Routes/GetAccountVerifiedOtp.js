const express = require('express');
const router = express.Router();
const { getAccountOtpStatus } = require('../Controllers/GetAccountVerifiedOtp');
const Verify=require('../Middleware/Verify');
// GET or POST /api/GetAccountVerifiedOtp
// Accepts: Username, Email or userId in query or body
router.get('/', Verify, getAccountOtpStatus);
router.post('/', Verify, getAccountOtpStatus);

module.exports = router;
