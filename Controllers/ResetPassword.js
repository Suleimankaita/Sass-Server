const asyncHandler = require('express-async-handler');
const bcrypt = require('bcryptjs');
const nodemailer = require('nodemailer');
const Company = require('../Models/Company');
const Admin = require('../Models/AdminOwner');
const CompanyUsers = require('../Models/CompanyUsers');
const Users = require('../Models/User');
const UserProfile = require('../Models/Userprofile'); // Ensure this is imported

// --- 📧 NODEMAILER CONFIG ---
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
});


/**
 * @desc Find a user across all models (checks Company direct Email & others via UserProfile)
 */
const findUserByEmail = async (email) => {
    const emailLower = email.toLowerCase();

    // 1. Check Company Model (where Email is directly on the model)
    const company = await Company.findOne({ Email: emailLower }).populate('UserProfileId');
    if (company) return { user: company, model: Company, type: 'Company' };

    // 2. Check UserProfile (where Email is stored for Admins, CompanyUsers, and regular Users)
    const profile = await UserProfile.findOne({ Email: emailLower });
    
    if (profile) {
        const profileId = profile._id;
        
        // Search across linked models
        const admin = await Admin.findOne({ UserProfileId: profileId }).populate('UserProfileId');
        if (admin) return { user: admin, model: Admin, type: 'Admin' };

        const compUser = await CompanyUsers.findOne({ UserProfileId: profileId }).populate('UserProfileId');
        if (compUser) return { user: compUser, model: CompanyUsers, type: 'CompanyUser' };

        const user = await Users.findOne({ UserProfileId: profileId }).populate('UserProfileId');
        if (user) return { user, model: Users, type: 'User' };
    }

    return null;
};

// 🔵 1. REQUEST OTP (Universal)
// 🔵 3. VERIFY OTP ONLY (Pre-check)
const verifyOTP = asyncHandler(async (req, res) => {
    const { Email, otp } = req.body;

    const result = await findUserByEmail(Email);
    if (!result) {
        return res.status(404).json({ message: "User not found." });
    }

    const { user } = result;

    if (!user.resetOTP || user.resetOTP !== otp) {
        return res.status(400).json({ message: "Invalid verification code." });
    }

    if (user.resetOTPExpires < Date.now()) {
        return res.status(400).json({ message: "Code has expired (5 min limit)." });
    }

    res.status(200).json({ success: true, message: "OTP verified. Proceed to reset." });
});

const requestOTP = asyncHandler(async (req, res) => {
    const { Email } = req.body;
    
    if (!Email) {
        return res.status(400).json({ message: "Email is required." });
    }

    const result = await findUserByEmail(Email);

    if (!result) {
        return res.status(404).json({ message: "No account found with this email." });
    }

    const { user } = result;

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Set expiry to 5 minutes
    user.resetOTP = otp;
    user.resetOTPExpires = Date.now() + 5 * 60 * 1000; 
    await user.save();

    // Determine Greeting Name (from Profile fullName or CompanyName)
    const userName = user.UserProfileId?.fullName || user.companyName || "there";

    // High-End Email Template
    const mailOptions = {
        from: `"YsStore Security" <${process.env.EMAIL_USER}>`,
        to: Email,
        subject: "🔒 Your Reset Code: " + otp,
        html: `
        <div style="background-color: #f4f7fa; padding: 50px 0; font-family: 'Segoe UI', Tahoma, Arial, sans-serif;">
            <div style="max-width: 450px; margin: auto; background: #ffffff; border-radius: 24px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.05); border: 1px solid #e6ebf1;">
                <div style="background: linear-gradient(135deg, #66c6ec 0%, #4fa8d1 100%); padding: 40px; text-align: center;">
                    <div style="background: rgba(255,255,255,0.2); width: 60px; height: 60px; border-radius: 18px; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 15px; margin-left: auto; margin-right: auto;">
                        <span style="font-size: 30px;">🔑</span>
                    </div>
                    <h1 style="color: white; margin: 0; font-size: 22px; font-weight: 700;">Password Reset</h1>
                </div>
                <div style="padding: 40px 30px; text-align: center;">
                    <p style="color: #1e293b; font-size: 17px; font-weight: 600; margin-bottom: 10px;">Hi ${userName},</p>
                    <p style="color: #475569; font-size: 15px; line-height: 1.5;">Use the verification code below to reset your YsStore password:</p>
                    
                    <div style="margin: 30px 0; padding: 20px; background: #f8fafc; border: 2px solid #66c6ec; border-radius: 16px;">
                        <span style="font-size: 36px; font-weight: 800; letter-spacing: 8px; color: #1e293b; font-family: 'Courier New', Courier, monospace;">${otp}</span>
                    </div>

                    <p style="color: #ef4444; font-size: 13px; font-weight: 600;">⚠️ This code expires in 5 minutes</p>
                    <hr style="border: 0; border-top: 1px solid #f1f5f9; margin: 30px 0;">
                    <p style="color: #94a3b8; font-size: 12px; line-height: 1.4;">If you didn't request this, please ignore this email or contact support if you have concerns.</p>
                </div>
                <div style="background: #f9fafb; padding: 20px; text-align: center; color: #cbd5e1; font-size: 11px; letter-spacing: 1px; font-weight: 700; text-transform: uppercase;">
                    &copy; ${new Date().getFullYear()} YsStore Platform
                </div>
            </div>
        </div>`
    };

    await transporter.sendMail(mailOptions);
    res.status(200).json({ message: "OTP sent successfully. Check your inbox!" });
});

// 🔵 2. VERIFY OTP & RESET PASSWORD
const resetPassword = asyncHandler(async (req, res) => {
    const { Email, otp, newPassword } = req.body;

    console.log(req.body)
    if (!Email || !otp || !newPassword) {
        return res.status(400).json({ message: "All fields are required." });
    }

    const result = await findUserByEmail(Email);

    if (!result) {
        return res.status(404).json({ message: "User not found. Session may have expired." });
    }

    const { user, type } = result;

    // 1. Verify OTP and Check Expiry
    if (!user.resetOTP || user.resetOTP !== otp) {
        return res.status(400).json({ message: "Invalid OTP code." });
    }

    if (user.resetOTPExpires < Date.now()) {
        return res.status(400).json({ message: "OTP has expired. Please request a new one." });
    }

    // 2. Hash the new password
    const salt = await bcrypt.genSalt(12);
    const hashed = await bcrypt.hash(newPassword, salt);
    
    // 3. Update the password in the correct location
    if (type === 'Company') {
        // Companies store password directly
        user.Password = hashed;
    } else {
        // Admins, Users, and CompanyUsers store password in the UserProfile document
        // We find the profile by ID and update it specifically
        await UserProfile.findByIdAndUpdate(user.UserProfileId._id, {
            password: hashed // Note: your schema uses lowercase 'password'
        });
    }

    // 4. Clear OTP fields on the parent document (Admin/User/Company) to prevent reuse
    user.resetOTP = undefined;
    user.resetOTPExpires = undefined;
    await user.save();

    res.status(200).json({ 
        success: true, 
        message: "Your password has been reset successfully. You can now log in." 
    });
});

module.exports = { requestOTP, resetPassword ,verifyOTP};