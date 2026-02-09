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
        auth: { user: "suleiman20015kaita@gmail.com", pass: "wwwh pvxz cqvl htjm" }
    });


const findUserAndEmail = async (Username) => {
  if (!Username) return null;

  const usernameLower = Username;

  // 1. Find user in correct order
  let user = await Admin.findOne({ Username: usernameLower }).exec();
  let role = "admin";

  if (!user) {
    user = await CompanyUsers.findOne({ Username: usernameLower }).exec();
    role = "companyUser";
  }

  if (!user) {
    user = await Users.findOne({ Username: usernameLower }).exec();
    role = "user";
  }

  if (!user) return null;

  // 2. Find profile linked to user
  const profile = await UserProfile.findById(user.UserProfileId).exec();
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
    
    if (!Username) return res.status(400).json({ message: "Username is required." });

    const result = await findUserAndEmail(Username);

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
        to: 'suleimanyusufdamale@icloud.com',
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

    const result = await findUserAndEmail(Username);
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