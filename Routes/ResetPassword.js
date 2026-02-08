const express = require('express');
const router = express.Router();
const { requestOTP, resetPassword,verifyOTP } = require('../Controllers/ResetPassword');

/**
 * @route   POST /api/auth/request-otp
 * @desc    Check email existence across all models and send 6-digit code
 * @access  Public
 */
router.post('/request-otp', requestOTP);

router.post('/verify-otp',verifyOTP );

/**
 * @route   POST /api/auth/reset-password
 * @desc    Validate OTP and update password in the correct database table
 * @access  Public
 */
router.post('/reset-password', resetPassword);

module.exports = router;