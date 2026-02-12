const Jwt = require('jsonwebtoken');
const asynchandler = require('express-async-handler');
const bcrypt = require('bcryptjs');
const nodemailer = require('nodemailer'); // 1. Added Nodemailer
const User = require('../Models/AdminOwner');
const Logs = require('../Models/UserLog');
const Settings = require('../Models/CompanySetting');
const { canUserLogin } = require('../utils/subscriptionCheck');

// --- NODEMAILER CONFIGURATION ---
const transporter = nodemailer.createTransport({
    service: 'gmail', 
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS, // Use an App Password, not your login password
    },
});

const Auth = asynchandler(async (req, res) => {
    try {
        const { Username, Password } = req.body;

        if (!Username || !Password) return res.status(400).json({ message: 'Username and Password are required' });

        const found = await User.findOne({ Username }).populate('UserProfileId').populate("companyId").exec();
        
        if (!found) return res.status(404).json({ message: 'User not found' });
        if (found.Active === false) return res.status(403).json({ message: 'Account suspended. Contact support.' });

        if (!found.UserProfileId || !found.UserProfileId.password) {
            return res.status(500).json({ message: 'User profile or password missing' });
        }
        // 1. Correct the order: bcrypt.compare(user_input, stored_hash)
const isMatch = await bcrypt.compare(Password, found.UserProfileId.password);

// 2. Correct the logic: If NOT a match (!isMatch), then return error
if (!isMatch) {
    return res.status(401).json({ 
        message: 'Incorrect username or password' 
    });
}

// If it reaches here, the password is correct...
        // Check subscription status for non-admin users
        if (found.companyId && found.Role !== "Admin") {
            const loginCheck = canUserLogin(found, found.companyId, found.Role);
            if (!loginCheck.canLogin) {
                return res.status(403).json({
                    message: loginCheck.message,
                    subscriptionStatus: loginCheck.subscriptionStatus
                });
            }
        }

        // --- 2. SEND ADMIN NOTIFICATION EMAIL ---
        if (found.UserProfileId.Email) {
           // Get client details
const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
const userAgent = req.headers['user-agent'] || 'Unknown Device';
const companyLogo = "https://your-domain.com/logo.png"; // Replace with your actual hosted logo URL

const mailOptions = {
    from: `"System Security" <${process.env.EMAIL_USER}>`,
    to: found.UserProfileId.Email,
      attachments: [{
                    filename: 'YSStore.png',
                    path: 'https://api.ysstoreapp.com/img/YSStore.png', // Ensure this is a valid local path or URL
                    cid: 'ysstorelogo'
                }],
    subject: `🚨 Security Alert: Admin Login for ${found.companyId?.CompanyName || 'System'}`,
    html: `
    <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; max-width: 600px; margin: 20px auto; border: 1px solid #eef2f6; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
        
        <div style="width:'100%';background-color: #ffffff; padding: 30px 20px; text-align: center; border-bottom: 1px solid #f0f0f0;">
            <img width='100%' height="150px" src="cid:ysstorelogo" alt="Company Logo" style=" margin-bottom: 10px;">
            <h2 style="color: #1a1f36; margin: 0; font-size: 22px; font-weight: 700;">New Login Detected</h2>
        </div>

        <div style="padding: 40px 30px; background-color: #ffffff;">
            <p style="font-size: 16px; color: #4f5b76; margin-bottom: 25px;">
                Hello <strong>${found.Username}</strong>,
            </p>
            <p style="font-size: 15px; color: #4f5b76; line-height: 1.6;">
                This is an automated security notification to inform you that your <strong>Administrator</strong> account was recently accessed. Please review the login details below to ensure this was you.
            </p>

            <div style="margin: 30px 0; padding: 25px; background-color: #f7fafc; border-radius: 12px; border: 1px solid #edf2f7;">
                <table style="width: 100%; border-collapse: collapse;">
                    <tr>
                        <td style="padding: 8px 0; color: #718096; font-size: 13px; width: 100px;"><strong>Company:</strong></td>
                        <td style="padding: 8px 0; color: #1a1f36; font-size: 14px;">${found.companyId?.CompanyName || 'N/A'}</td>
                    </tr>
                    <tr>
                        <td style="padding: 8px 0; color: #718096; font-size: 13px;"><strong>Time:</strong></td>
                        <td style="padding: 8px 0; color: #1a1f36; font-size: 14px;">${new Date().toLocaleString()}</td>
                    </tr>
                    <tr>
                        <td style="padding: 8px 0; color: #718096; font-size: 13px;"><strong>IP Address:</strong></td>
                        <td style="padding: 8px 0; color: #1a1f36; font-size: 14px;"><code>${ip}</code></td>
                    </tr>
                    <tr>
                        <td style="padding: 8px 0; color: #718096; font-size: 13px;"><strong>Device:</strong></td>
                        <td style="padding: 8px 0; color: #1a1f36; font-size: 14px; line-height: 1.4;">${userAgent}</td>
                    </tr>
                </table>
            </div>

            <div style="text-align: center; margin-top: 35px;">
                <p style="font-size: 14px; color: #d93025; margin-bottom: 20px; font-weight: 500;">
                    Was this not you? Someone may have your password.
                </p>
                <a href="https://your-app.com/reset-password" style="background-color: #1a73e8; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; display: inline-block; font-size: 14px;">
                    Secure My Account
                </a>
            </div>
        </div>

        <div style="padding: 25px; background-color: #fcfcfd; text-align: center; border-top: 1px solid #f0f0f0;">
            <p style="font-size: 12px; color: #a0aec0; margin: 0;">
                You are receiving this because security alerts are enabled for Admin roles.<br>
                &copy; ${new Date().getFullYear()} ${found.companyId?.CompanyName || 'Your Company'}. All rights reserved.
            </p>
        </div>
    </div>
    `,
};            // We fire and forget (no await) so the login response isn't delayed by the email sending
            transporter.sendMail(mailOptions).catch(err => console.error('Email failed:', err));
        }

        // Create login log
        const logEntry = await Logs.create({
            Username: found.Username,
            Date: new Date().toISOString().split('T')[0],
            time: new Date().toLocaleTimeString(),
        });

        if (!found.UserLogId) found.UserLogId = [];
        found.UserLogId.push(logEntry._id);
        if (!found.Role) found.Role = 'User';
        await found.save();

        const payload = {
            UserInfo: {
                Username: found.Username,
                Role: found.Role,
                id: found._id,
                companyId: found?.companyId?._id,
                companyName: found?.companyId?.CompanyName
            },
        };

        const accessToken = Jwt.sign(payload, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '15m' });
        const refreshToken = Jwt.sign(payload, process.env.REFRESH_TOKEN_SECRET, { expiresIn: '7d' });

        found.UserProfileId.token = refreshToken;
        const cookieOptions = {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
            maxAge: 7 * 24 * 60 * 60 * 1000,
        };

        await found.save();
        await found.UserProfileId.save();
        res.clearCookie('jwt', cookieOptions); 
        res.cookie('AdminCookie', refreshToken, cookieOptions); 
        return res.status(200).json({ accessToken, role: found.Role, status: 201 });

    } catch (err) {
        return res.status(500).json({ message: err.message });
    }
});

module.exports = Auth;