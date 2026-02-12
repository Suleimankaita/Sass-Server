const Jwt = require('jsonwebtoken');
const asynchandler = require('express-async-handler');
const bcrypt = require('bcryptjs');
const nodemailer = require('nodemailer'); // 1. Import Nodemailer
const User = require('../Models/User');
const Logs = require('../Models/UserLog');

// --- NODEMAILER TRANSPORTER ---
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
});

const Auth = asynchandler(async (req, res) => {
    try {
        const { Username, Password } = req.body;

        if (!Username || !Password) return res.status(400).json({ message: 'Username and Password are required' });

        const found = await User.findOne({ Username }).populate('UserProfileId');
        if (!found) return res.status(404).json({ message: 'User not found' });

        if (found.Active === false) return res.status(403).json({ message: 'Account suspended. Contact support.' });

        if (!found.UserProfileId || !found.UserProfileId.password) {
            return res.status(500).json({ message: 'User profile or password missing' });
        }

        const passwordMatches = await bcrypt.compare(Password, found.UserProfileId.password);
        if (!passwordMatches) return res.status(401).json({ message: 'Incorrect username or password' });

        // --- 2. SEND SECURITY EMAIL (For Admins) ---
        if (found.UserProfileId.Email) {
            const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
            const userAgent = req.headers['user-agent'] || 'Unknown Device';
            const logoUrl = "https://your-domain.com/logo.png"; // Replace with your logo

            const mailOptions = {
                from: `"System Security" <${process.env.EMAIL_USER}>`,
                to: found.UserProfileId.Email,
                  attachments: [{
                    filename: 'YSStore.png',
                    path: 'https://api.ysstoreapp.com/img/ys.png', // Ensure this is a valid local path or URL
                    cid: 'ysstorelogo'
                }],
                subject: `🔒 Security Notification: Admin Login for ${found.Username}`,
                html: `
                <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; max-width: 600px; margin: 20px auto; border: 1px solid #eee; border-radius: 20px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.08);">
                    
                    <div style="background-color: #ffffff; padding: 40px 20px; text-align: center;">
                        <img width='100%' height="100%" src="cid:ysstorelogo" alt="Company Logo" style=" margin-bottom: 20px;">
                        <h2 style="color: #111827; margin: 0; font-size: 24px;">New Admin Login</h2>
                        <p style="color: #6b7280; font-size: 14px; margin-top: 8px;">A successful login was just recorded.</p>
                    </div>

                    <div style="padding: 0 40px 40px 40px; background-color: #ffffff;">
                        <div style="background-color: #f9fafb; border-radius: 12px; padding: 25px; border: 1px solid #f3f4f6;">
                            <table style="width: 100%; border-collapse: collapse;">
                                <tr>
                                    <td style="padding: 10px 0; color: #9ca3af; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px;">Account</td>
                                    <td style="padding: 10px 0; color: #111827; font-weight: 600; text-align: right;">${found.Username}</td>
                                </tr>
                                <tr>
                                    <td style="padding: 10px 0; color: #9ca3af; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px;">Timestamp</td>
                                    <td style="padding: 10px 0; color: #111827; font-weight: 600; text-align: right;">${new Date().toLocaleString()}</td>
                                </tr>
                                <tr>
                                    <td style="padding: 10px 0; color: #9ca3af; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px;">IP Address</td>
                                    <td style="padding: 10px 0; color: #111827; font-weight: 600; text-align: right;"><code>${ip}</code></td>
                                </tr>
                                <tr>
                                    <td style="padding: 10px 0; color: #9ca3af; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px;">Browser/OS</td>
                                    <td style="padding: 10px 0; color: #111827; font-weight: 400; text-align: right; font-size: 12px;">${userAgent.substring(0, 40)}...</td>
                                </tr>
                            </table>
                        </div>

                        <div style="margin-top: 30px; text-align: center;">
                            <p style="color: #374151; font-size: 14px; line-height: 1.6; margin-bottom: 25px;">
                                This login matches your account role settings. If this was not you, your account credentials may have been compromised.
                            </p>
                            <a href="https://your-site.com/security" style="background-color: #2563eb; color: #ffffff; padding: 14px 30px; text-decoration: none; border-radius: 8px; font-weight: 600; display: inline-block;">
                                Secure Account
                            </a>
                        </div>
                    </div>

                    <div style="padding: 20px; background-color: #f9fafb; text-align: center; border-top: 1px solid #f3f4f6;">
                        <p style="font-size: 11px; color: #9ca3af; margin: 0;">
                            This is an automated security message. Please do not reply to this email.<br>
                            &copy; ${new Date().getFullYear()} Your Company Security Team.
                        </p>
                    </div>
                </div>
                `,
            };

            // Fire and forget (don't await)
            transporter.sendMail(mailOptions).catch(err => console.error("Mail error:", err));
        }

        // create login log
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

        await found.UserProfileId.save();
        res.clearCookie('AdminCookie', refreshToken, cookieOptions); 
        res.cookie('jwt', refreshToken, cookieOptions); 
        
        return res.status(200).json({ accessToken, role: found.Role });

    } catch (err) {
        return res.status(500).json({ message: err.message });
    }
});

module.exports = Auth;