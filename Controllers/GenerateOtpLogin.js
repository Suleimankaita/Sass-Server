const asyncHandler = require('express-async-handler');
const Company = require('../Models/Company');
const Admin = require('../Models/AdminOwner');
const CompanyUsers = require('../Models/CompanyUsers');
const Users = require('../Models/User');
const UserProfile = require('../Models/Userprofile');
const nodemailer = require('nodemailer');

/**
 * @desc Helper: Finds the account and the correct email address linked to the Username
 */

  const transporter = nodemailer.createTransport({
        service: 'gmail', 
        auth: { user: "ysstore.markets@gmail.com", pass: "gdjv kksj apjo urri" }
    });


const findUserAndEmail = async (id) => {
  if (!id) return null;

  // 1. Find user in correct order
  let user = await Admin.findById(id.toString());
  let role = "admin";

  if (!user) {
    user = await CompanyUsers.findById(id.toString());
    role = "companyUser";
  }

  if (!user) {
    user = await Users.findById(id.toString());
    role = "user";
  }

    console.log(user)
  if (!user) return null;

  // 2. Find profile linked to user
  const profile = await UserProfile.findById(user.UserProfileId);
  if (!profile || !profile.Email) return null;

  return {
    user,
    email: profile.Email,
    role,
  };
};


// 🔵 1. REQUEST OTP (Expires in 2 Minutes)
const requestVerificationOTP = asyncHandler(async (req, res) => {
    const { Username } = req.body;
    const id=req.userId
    if (!id) return res.status(400).json({ message: "User ID is required." });

    const result = await findUserAndEmail(id);

    if (!result || !result.email) {
        return res.status(404).json({ message: "No email associated with this account." });
    }

    const { user, email } = result;

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Set 2-minute expiry
    user.resetOTP = otp;
    user.resetOTPExpires = Date.now() + 2 * 60 * 1000; 
    user.IsOtpverified = false; // Set to false when a new code is requested
    await user.save();

    const mailOptions = {
        from: `"YsStore Security" <${process.env.EMAIL_USER}>`,
        to: "Suleiman20015kaita@gmail.com",
        subject: `Your Verification Code: ${otp}`,
        html: `
            <div style="font-family: sans-serif; text-align: center; padding: 20px;">
                <h2>Identity Verification</h2>
                <p>Use the code below to verify your account. This code is valid for <b>2 minutes</b>.</p>
                <h1 style="letter-spacing: 5px; color: #2563eb;">${otp}</h1>
                <p style="color: #64748b; font-size: 12px;">If you didn't request this, please ignore this email.</p>
            </div>
        `
    };

    await transporter.sendMail(mailOptions);
    
    res.status(200).json({ message: "Verification code sent to your registered email.", success: true });
});

// 🔵 2. VERIFY OTP (Identity Confirmation)
const verifyUserOTP = asyncHandler(async (req, res) => {
    const { Username, otp } = req.body;
    const id=req.userId
    const result = await findUserAndEmail(id);
    if (!result) return res.status(404).json({ message: "Account not found." });

    const { user } = result;

    // Check if code matches
    if (!user.resetOTP || user.resetOTP !== otp) {
        return res.status(400).json({ message: "Invalid verification code." });
    }

    // Check 2-minute expiration
    if (user.resetOTPExpires < Date.now()) {
        return res.status(400).json({ message: "Verification code has expired (2 min limit)." });
    }

    // ✅ VERIFICATION SUCCESSFUL
    user.IsOtpverified = true;
    user.resetOTP = undefined; // Clear code so it cannot be used again
    user.resetOTPExpires = undefined;
    await user.save();

    res.status(200).json({ 
        success: true, 
        message: "Identity successfully verified." 
    });
});

module.exports = { requestVerificationOTP, verifyUserOTP };