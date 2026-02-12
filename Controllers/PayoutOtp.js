const asynchandler = require('express-async-handler');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const Admin = require('../Models/AdminOwner');
const CompanyUsers = require('../Models/CompanyUsers');

// --- 1. OTP GENERATOR HELPER ---
const generateOTP = (minutes = 10) => {
    const code = crypto.randomInt(100000, 999999).toString();
    const expires = new Date(Date.now() + minutes * 60 * 1000);
    return { code, expires };
};

// --- 2. CONTROLLER ---
const Generate = asynchandler(async (req, res) => {
    const userId = req.userId; // Ensure your auth middleware provides this

    // Find the user in either collection
    const user = await Admin.findById(userId).populate("UserProfileId") || await CompanyUsers.findById(userId).populate("UserProfileId");
    if (!user) return res.status(404).json({ message: "User not found" });

    // 1. Generate the OTP
    const { code, expires } = generateOTP(10);

    // 2. Save to the database
    user.otp = code;
    user.otpExpires = expires;
    await user.save();

    // 3. Configure Nodemailer Transporter
    const transporter = nodemailer.createTransport({
        service: 'gmail', // or your SMTP provider
        auth: {
            // user: process.env.EMAIL_USER, // Your email
            user: process.env.EMAIL_USER, // Your email
            pass: process.env.EMAIL_PASS, // Your App Password
        },
    });

    // 4. Send Email with Logo
    try {
        await transporter.sendMail({
            from: `"Secure Payout" <${process.env.EMAIL_USER}>`,
            // to: user.Username, // Assuming 'Username' stores the email address
            to: user?.UserProfileId.Email, // Assuming 'Email' is the field storing the email address
            subject: "Your Payout Verification Code",
             attachments: [{
                    filename: 'YSStore.png',
                    path: 'https://api.ysstoreapp.com/img/YSStore.png', // Ensure this is a valid local path or URL
                    cid: 'ysstorelogo'
                }],
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; border: 1px solid #e2e8f0; border-radius: 16px; padding: 40px;">
                    <div style="text-align: center; margin-bottom: 30px;">
                        <img src="cid:ysstorelogo" alt="Company Logo" style="width: 120px; height: auto;" />
                    </div>
                    
                    <h2 style="color: #1a202c; text-align: center; font-size: 24px;">Confirm Your Payout</h2>
                    <p style="color: #4a5568; line-height: 1.6; text-align: center;">
                        You are initiating a payout transaction. Please use the verification code below to authorize this request.
                    </p>
                    
                    <div style="background: #f0fff4; border: 2px dashed #68d391; border-radius: 12px; padding: 20px; text-align: center; margin: 30px 0;">
                        <span style="font-size: 40px; font-weight: 900; letter-spacing: 8px; color: #2f855a;">${code}</span>
                    </div>
                    
                    <p style="color: #718096; font-size: 12px; text-align: center;">
                        This code is valid for 10 minutes. If you did not request this, please ignore this email or contact support.
                    </p>
                    
                    <div style="border-top: 1px solid #edf2f7; margin-top: 30px; padding-top: 20px; text-align: center; color: #a0aec0; font-size: 11px;">
                        &copy; ${new Date().getFullYear()} Your Company Name. All rights reserved.
                    </div>
                </div>
            `,
        });

        res.status(200).json({ 
            success: true, 
            message: "A verification code has been sent to your registered email." 
        });

    } catch (error) {
        console.error("Mail Error:", error);
        res.status(500).json({ message: "Error sending OTP email" });
    }
});

module.exports = { Generate };