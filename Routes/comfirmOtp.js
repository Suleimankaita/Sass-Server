const express = require('express');
const router = express.Router();
const { 
    requestVerificationOTP, 
    verifyUserOTP 
} = require('../Controllers/GenerateOtpLogin'); // Adjust path as needed
    const Verify=require('../Middleware/Verify');
// @route   POST /api/verify/request-otp
// @desc    Finds account by username and sends 6-digit code to email (2 min expiry)

// @route   POST /api/verify/confirm-otp
// @desc    Checks the 6-digit code and sets IsOtpverified to true
router.post('/',Verify, verifyUserOTP);

module.exports = router;