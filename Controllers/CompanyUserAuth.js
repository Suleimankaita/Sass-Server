const Jwt = require('jsonwebtoken');
const asynchandler = require('express-async-handler');
const User = require('../Models/CompanyUsers');
const Logss = require("../Models/UserLog");
const Branch = require("../Models/Branch");
const Company = require("../Models/Company");
const Settings = require("../Models/CompanySetting");

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

    // 2. Find Company or Branch (The "Parent")
    const comfound = await Company.findById(found.companyId).lean() || 
                     await Branch.findById(found.companyId).lean();

    if (!comfound) return res.status(400).json({ message: 'Company/Branch credentials not found' });

    // 3. Check Settings for Time Restrictions
    const setting = await Settings.findOne({
      $or: [{ companyId: found.companyId }, { branchId: found.companyId }]
    }).exec();

    // Default Refresh Expiry (7 days in seconds)
    let refreshExpirySeconds = 7 * 24 * 60 * 60; 
    const isPrivileged = ["admin", "manager"].includes(found.Role.toLowerCase());

    if (setting && setting.enableTimeRestrictions && !isPrivileged) {
      const now = new Date();
      const currentMinutes = now.getHours() * 60 + now.getMinutes();

      const [startH, startM] = setting.loginStartTime.split(':').map(Number);
      const [endH, endM] = setting.loginEndTime.split(':').map(Number);
      
      const startMinutes = startH * 60 + startM;
      const endMinutes = endH * 60 + endM;

      // Check if current time is within allowed window
      if (currentMinutes < startMinutes || currentMinutes > endMinutes) {
        return res.status(403).json({ 
          message: `Access denied. Authorized hours: ${setting.loginStartTime} to ${setting.loginEndTime}` 
        });
      }

      // Calculate seconds remaining until loginEndTime (e.g., 20:00)
      const expiryDate = new Date();
      expiryDate.setHours(endH, endM, 0, 0);
      
      // Calculate TTL (Time To Live) in seconds
      refreshExpirySeconds = Math.floor((expiryDate.getTime() - now.getTime()) / 1000);
      
      // Safety: If it's very close to closing, give at least 1 minute or handle error
      if (refreshExpirySeconds <= 0) refreshExpirySeconds = 60; 
    }

    // 4. Generate Tokens
    const payload = {
      UserInfo: {
        Username: found.Username,
        Role: found.Role,
        id: found._id,
        companyId: found.companyId,
        CompanyName: comfound.CompanyName || comfound.name
      }
    };

    const accessToken = Jwt.sign(payload, process.env.ACCESS_TOKEN_SECRET, { expiresIn: "15m" });
    
    // Refresh token expires exactly at closing time for staff
    const refreshToken = Jwt.sign(payload, process.env.REFRESH_TOKEN_SECRET, { 
      expiresIn: isPrivileged ? "7d" : refreshExpirySeconds 
    });

    // 5. Update Profile & Logs
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

    // Set Cookie maxAge to match the token expiry
      res.clearCookie('AdminCookie', refreshToken, {
      sameSite: "none",
      secure: true,
      httpOnly: true,
      maxAge: 7 * 24 * 60 * 60 * 1000}); 
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