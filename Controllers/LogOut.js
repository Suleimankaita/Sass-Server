const asyncHandler = require('express-async-handler');
const Admin = require('../Models/AdminOwner');
const User = require('../Models/User');
const CompanyUser = require('../Models/CompanyUsers');
const UserLog = require('../Models/UserLog');

// Single User Logout
const LogOut = asyncHandler(async (req, res) => {
  const user = req.user;

  if (!user) {
     res.status(401).json({ message: 'Unauthorized' });
  }

  let token;
  if(user&&user.Role === 'Admin'||user.Role === 'SuperAdmin') {
    token='AdminCookie';
  } else {
    token='jwt';
  }
  // Log the logout action
  if(user){

      await UserLog.create({
          userId: user._id,
          Username: user.Username,
          action: 'Logout',
          date: new Date(),
          time: new Date().toLocaleTimeString(),
        });
    }

  // 🔥 CLEAR AUTH COOKIE
  res.clearCookie(token, {
    httpOnly: true,
    secure:true,
    sameSite: 'none',
  });
  res.clearCookie('refreshToken', {
    httpOnly: true,
    secure:true,
    sameSite: 'none',
  });

  res.status(200).json({
    success: true,
    message: 'Logged out successfully',
  });
});

// Logout All Users (excluding SuperAdmin)
const LogOutAll = asyncHandler(async (req, res) => {
    try {
        const adminId = req.userId;

        // Verify the requester is an admin
        const admin = await Admin.findById(adminId);
        if (!admin) {
            return res.status(401).json({ message: 'Admin not found or unauthorized' });
        }

        // Get the admin's company
        const companyId = admin.companyId;

        // Create logout log entries for all users except SuperAdmin
        // 1. Logout all CompanyUsers (exclude SuperAdmin role if applicable)
        const companyUsers = await CompanyUser.find({
            companyId: companyId,
            Role: { $ne: 'SuperAdmin' } // Exclude SuperAdmin
        }).select('Username _id');

        const logoutLogs = [];
        
        for (const user of companyUsers) {
            const logEntry = await UserLog.create({
                Username: user.Username,
                action: 'Logout',
                Date: new Date().toISOString().split('T')[0],
                time: new Date().toLocaleTimeString(),
            });
            logoutLogs.push({
                userId: user._id,
                username: user.Username,
                logId: logEntry._id
            });
        }

        // 2. Also logout regular users associated with this company if needed
        const regularUsers = await User.find({
            Active: true,
            Role: { $ne: 'SuperAdmin' }
        }).select('Username _id');

        for (const user of regularUsers) {
            const logEntry = await UserLog.create({
                Username: user.Username,
                action: 'Logout',
                Date: new Date().toISOString().split('T')[0],
                time: new Date().toLocaleTimeString(),
            });
            logoutLogs.push({
                userId: user._id,
                username: user.Username,
                logId: logEntry._id
            });
        }

        res.status(200).json({
            success: true,
            message: `All users logged out successfully (${companyUsers.length + regularUsers.length} users)`,
            data: {
                logoutAt: new Date(),
                usersLoggedOut: logoutLogs.length,
                details: logoutLogs
            }
        });

    } catch (err) {
        res.status(500).json({ message: 'LogOut All failed: ' + err.message });
    }
});

module.exports = { LogOut, LogOutAll };
