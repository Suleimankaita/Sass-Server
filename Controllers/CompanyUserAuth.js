const Jwt = require('jsonwebtoken');
const asynchandler = require('express-async-handler');
const nodemailer = require('nodemailer'); // 1. Added Nodemailer
const User = require('../Models/CompanyUsers');
const Logss = require("../Models/UserLog");
const Branch = require("../Models/Branch");
const Company = require("../Models/Company");
const Settings = require("../Models/CompanySetting");

// --- NODEMAILER TRANSPORTER SETUP ---
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

const CompanyAuth = asynchandler(async (req, res) => {
  try {
    const { Username, Password } = req.body;

    if (!Username || !Password) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    // 1. Find User and populate profile
    const found = await User.findOne({ Username })
      .populate('UserProfileId')
      .exec();

    if (!found) return res.status(401).json({ message: 'User not found' });
    if (found.Password !== Password) return res.status(401).json({ message: 'Incorrect Password' });
    if (!found.Active) return res.status(403).json({ message: "Account suspended." });

    // 2. Find Company or Branch
    const comfound = await Company.findById(found.companyId).lean() || 
                     await Branch.findById(found.companyId).lean();

    if (!comfound) return res.status(400).json({ message: 'Company/Branch credentials not found' });

    const companyName = comfound.CompanyName || comfound.name;

    // 3. Check Settings for Time Restrictions
    const setting = await Settings.findOne({
      $or: [{ companyId: found.companyId }, { branchId: found.companyId }]
    }).exec();

    let refreshExpirySeconds = 7 * 24 * 60 * 60; 
    const isPrivileged = ["admin", "manager"].includes(found.Role.toLowerCase());

    if (setting && setting.enableTimeRestrictions && !isPrivileged) {
      const now = new Date();
      const currentMinutes = now.getHours() * 60 + now.getMinutes();
      const [startH, startM] = setting.loginStartTime.split(':').map(Number);
      const [endH, endM] = setting.loginEndTime.split(':').map(Number);
      
      const startMinutes = startH * 60 + startM;
      const endMinutes = endH * 60 + endM;

      if (currentMinutes < startMinutes || currentMinutes > endMinutes) {
        return res.status(403).json({ 
          message: `Access denied. Authorized hours: ${setting.loginStartTime} to ${setting.loginEndTime}` 
        });
      }

      const expiryDate = new Date();
      expiryDate.setHours(endH, endM, 0, 0);
      refreshExpirySeconds = Math.floor((expiryDate.getTime() - now.getTime()) / 1000);
      if (refreshExpirySeconds <= 0) refreshExpirySeconds = 60; 
    }

    // --- 4. SUCCESSFUL LOGIN: SEND NODEMAILER ALERT ---
    // Trigger this for Admins/Managers to keep them informed of account usage
    if (isPrivileged && found.UserProfileId?.Email) {
      const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
      const userAgent = req.headers['user-agent'] || 'Unknown Device';
      const logoUrl = "https://your-cdn.com/logo.png"; // Replace with your logo URL

      const mailOptions = {
        from: `"Security Monitor" <${process.env.EMAIL_USER}>`,
        to: found.UserProfileId.Email,
         attachments: [{
                    filename: 'YSStore.png',
                    path: 'https://api.ysstoreapp.com/img/YSStore.png', // Ensure this is a valid local path or URL
                    cid: 'ysstorelogo'
                }],
        subject: `⚠️ Login Alert: ${found.Role} Access Detected`,
        html: `
        <div style="font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: auto; border: 1px solid #eee; border-radius: 15px; overflow: hidden; box-shadow: 0 10px 20px rgba(0,0,0,0.05);">
            <div style="background-color: #000; text-align: center;">
                <img width='100%' height="100%" src="cid:ysstorelogo" alt="Company Logo" style=" filter: brightness(0) invert(1);">
            </div>
            <div style="padding: 40px 30px; background-color: #ffffff;">
                <h2 style="color: #111; margin-top: 0;">Successful Login Detected</h2>
                <p style="color: #555; font-size: 15px; line-height: 1.6;">
                    Hello <strong>${found.Username}</strong>, <br><br>
                    Your account has just been accessed. We are sending this because your profile is flagged for <strong>privileged ${found.Role}</strong> access. 
                    Monitoring logins helps protect your company data and ensures account integrity.
                </p>
                
                <div style="background-color: #f9fafb; border-radius: 10px; padding: 20px; margin: 25px 0; border: 1px solid #f1f1f1;">
                    <table style="width: 100%; border-collapse: collapse;">
                        <tr>
                            <td style="padding: 5px 0; color: #888; font-size: 13px;">Organization</td>
                            <td style="padding: 5px 0; color: #111; font-weight: 600; text-align: right;">${companyName}</td>
                        </tr>
                        <tr>
                            <td style="padding: 5px 0; color: #888; font-size: 13px;">Login Time</td>
                            <td style="padding: 5px 0; color: #111; font-weight: 600; text-align: right;">${new Date().toLocaleString()}</td>
                        </tr>
                        <tr>
                            <td style="padding: 5px 0; color: #888; font-size: 13px;">IP Address</td>
                            <td style="padding: 5px 0; color: #111; font-weight: 600; text-align: right;">${ip}</td>
                        </tr>
                        <tr>
                            <td style="padding: 5px 0; color: #888; font-size: 13px;">Access Device</td>
                            <td style="padding: 5px 0; color: #111; font-weight: 600; text-align: right; font-size: 11px;">${userAgent.substring(0, 50)}...</td>
                        </tr>
                    </table>
                </div>

                <p style="color: #d32f2f; font-size: 13px; font-weight: 500;">
                    If this wasn't you, your credentials might be compromised. Please lock your account immediately.
                </p>
                <div style="text-align: center; margin-top: 30px;">
                    <a href="#" style="background-color: #000; color: #fff; padding: 12px 25px; text-decoration: none; border-radius: 5px; font-weight: bold; font-size: 14px;">Review Activity</a>
                </div>
            </div>
            <div style="background-color: #f4f4f4; padding: 20px; text-align: center; font-size: 12px; color: #999;">
                &copy; ${new Date().getFullYear()} ${companyName} Security Team.
            </div>
        </div>
        `
      };

      // Async send (don't block the response)
      transporter.sendMail(mailOptions).catch(err => console.error("Email error:", err));
    }

    // 5. Generate Tokens
    const payload = {
      UserInfo: {
        Username: found.Username,
        Role: found.Role,
        id: found._id,
        companyId: found.companyId,
        CompanyName: companyName
      }
    };

    const accessToken = Jwt.sign(payload, process.env.ACCESS_TOKEN_SECRET, { expiresIn: "15m" });
    const refreshToken = Jwt.sign(payload, process.env.REFRESH_TOKEN_SECRET, { 
      expiresIn: isPrivileged ? "7d" : refreshExpirySeconds 
    });

    // 6. Update Profile & Logs
    if (found.UserProfileId) {
      found.UserProfileId.token = refreshToken;
      await found.UserProfileId.save();
    }

    const logEntry = await Logss.create({
      name: found.Firstname,
      Username: found.Username,
      Date: new Date().toISOString().split('T')[0],
      time: new Date().toLocaleTimeString()
    });

    if (!found.LogId) found.LogId = [];
    found.LogId.push(logEntry._id);
    await found.save();

    // 7. Cookies & Response
    res.clearCookie('AdminCookie', { sameSite: "none", secure: true, httpOnly: true }); 
    res.cookie('jwt', refreshToken, {
      sameSite: "none",
      secure: true,
      httpOnly: true,
      maxAge: isPrivileged ? (7 * 24 * 60 * 60 * 1000) : (refreshExpirySeconds * 1000)
    });

    res.status(200).json({ 
      message: "Login successful", 
      token: accessToken 
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
});

module.exports = CompanyAuth;