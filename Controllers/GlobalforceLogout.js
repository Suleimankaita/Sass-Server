const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const UserProfile = require('../Models/Userprofile');
const SecurityCompliance = require('../Models/Sesion');
const Admin = require('../Models/AdminOwner');

class GlobalForceLogoutController {
  
  // Method 1: Clear tokens from ALL user collections (Excluding SuperAdmin)
  static clearAllUserTokens = async (req, res) => {
    try {
      const { Role, userId, username, email } = req.user;
      const { reason = 'Global force logout initiated by SuperAdmin' } = req.body;

      // 🔐 1. Strict Authorization
      if (Role !== 'SuperAdmin') {
        return res.status(403).json({ success: false, message: 'Only SuperAdmin can perform this action' });
      }

      const stats = { userProfileCleared: 0, companyUsersCleared: 0, adminUsersCleared: 0, sessionsTerminated: 0 };

      // 🔍 STEP 1: Identify ALL SuperAdmins to protect them
      const superAdminUsers = await Admin.find({ Role: 'SuperAdmin' }, '_id').lean();
      const superAdminIds = superAdminUsers.map(admin => admin._id.toString());

      // 2️⃣ CLEAR USERPROFILES (Excluding all SuperAdmin IDs)
      const userProfileResult = await UserProfile.updateMany(
        { 
          token: { $ne: null }, 
          _id: { $nin: superAdminIds } // Protects any UserProfile linked to a SuperAdmin ID
        },
        { $set: { token: null, updatedAt: new Date() } }
      );
      stats.userProfileCleared = userProfileResult.modifiedCount;

      // 3️⃣ CLEAR COMPANY USERS (Excluding all SuperAdmin IDs)
      if (mongoose.modelNames().includes('CompanyUsers')) {
        const CompanyUsers = mongoose.model('CompanyUsers');
        const companyUsersResult = await CompanyUsers.updateMany(
          { 
            token: { $ne: null }, 
            _id: { $nin: superAdminIds } // Fix: Protects ALL superadmins, not just current one
          },
          { $set: { token: null, updatedAt: new Date() } }
        );
        stats.companyUsersCleared = companyUsersResult.modifiedCount;
      }

      // 4️⃣ CLEAR ADMINS (Excluding SuperAdmin Role)
      const adminResult = await Admin.updateMany(
        { 
          token: { $ne: null }, 
          Role: { $ne: 'SuperAdmin' } 
        },
        { $set: { token: null, updatedAt: new Date() } }
      );
      stats.adminUsersCleared = adminResult.modifiedCount;

      // 5️⃣ TERMINATE SESSIONS (Excluding all SuperAdmin IDs)
      const sessionResult = await SecurityCompliance.updateMany(
        {
          DataType: 'session',
          IsSessionActive: true,
          UserId: { $nin: superAdminIds } // Protects SuperAdmin active sessions
        },
        {
          $set: {
            IsSessionActive: false,
            // NOTE: Ensure 'global_force_logout' is in your SessionType Enum in Models/Sesion.js
            SessionType: 'global_force_logout', 
            TerminatedAt: new Date(),
            TerminatedBy: userId,
            TerminationReason: reason
          }
        }
      );
      stats.sessionsTerminated = sessionResult.modifiedCount;

      // 6️⃣ BLACKLIST TOKENS (Passing the protection list)
      await this.blacklistAllTokens(superAdminIds);

      // 7️⃣ LOG ACTION
      // 🚨 IMPORTANT: If you get an Enum Error here, update your ActivityType Enum 
      // in Models/Sesion.js to include 'global_force_logout'
      await SecurityCompliance.create({
        DataType: 'log',
        ActivityType: 'global_force_logout', 
        Username: username || email,
        IpAddress: req.ip,
        ActionTarget: 'ALL_NON_SUPERADMIN_USERS',
        ActionDetails: `${reason}. Protected ${superAdminIds.length} SuperAdmin accounts.`,
        Severity: 'critical',
        Status: 'success',
        CreatedBy: userId
      });

      return res.status(200).json({
        success: true,
        message: 'Global force logout completed. All non-admin sessions revoked.',
        data: { ...stats, protectedSuperAdmins: superAdminIds.length }
      });

    } catch (error) {
      console.error('Global force logout error:', error);
      return res.status(500).json({ success: false, message: 'Global logout failed', error: error.message });
    }
  };

  // Method 2: Selective logout by user type (Excluding SuperAdmin)
  static clearTokensByUserType = async (req, res) => {
    try {
      const { Role, userId, username, email } = req.user;
      const { userType, reason = 'Selective force logout' } = req.body;

      if (Role !== 'SuperAdmin') return res.status(403).json({ success: false, message: 'Unauthorized' });

      // Identify SuperAdmins to exclude
      const superAdminUsers = await Admin.find({ Role: 'SuperAdmin' }, '_id').lean();
      const superAdminIds = superAdminUsers.map(admin => admin._id.toString());

      let model;
      let filter = { token: { $ne: null } };
      
      if (userType === 'Admin') {
        model = Admin;
        filter.Role = { $ne: 'SuperAdmin' };
      } else if (userType === 'UserProfile') {
        model = UserProfile;
        filter._id = { $nin: superAdminIds };
      } else {
        model = mongoose.model('CompanyUsers');
        filter._id = { $nin: superAdminIds };
      }

      const updateResult = await model.updateMany(filter, { $set: { token: null, updatedAt: new Date() } });

      res.status(200).json({ success: true, message: `Logged out all ${userType} (Admins protected)`, cleared: updateResult.modifiedCount });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  };

  // Method 3: Logout specific user (Excluding SuperAdmin)
  static clearTokenByUserId = async (req, res) => {
    try {
      const { Role, userId } = req.user;
      const { targetUserId, userType } = req.body;

      if (Role !== 'SuperAdmin') return res.status(403).json({ success: false });

      const model = userType === 'Admin' ? Admin : userType === 'UserProfile' ? UserProfile : mongoose.model('CompanyUsers');
      const targetUser = await model.findById(targetUserId);

      if (!targetUser) return res.status(404).json({ success: false, message: 'User not found' });

      // 🛡️ Security Guard: Check if the target is a SuperAdmin
      if (targetUser.Role === 'SuperAdmin' || (userType === 'UserProfile' && await Admin.findOne({ _id: targetUserId, Role: 'SuperAdmin' }))) {
        return res.status(403).json({ success: false, message: 'Cannot force logout a SuperAdmin account' });
      }

      await model.findByIdAndUpdate(targetUserId, { $set: { token: null, updatedAt: new Date() } });
      res.status(200).json({ success: true, message: 'User token cleared' });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  };

  // ============ HELPER METHODS ============

  static blacklistAllTokens = async (excludedUserIds = []) => {
    try {
      if (mongoose.modelNames().includes('TokenBlacklist')) {
        const TokenBlacklist = mongoose.model('TokenBlacklist');
        
        const userTokens = await UserProfile.find({ token: { $ne: null }, _id: { $nin: excludedUserIds } }, 'token');
        const adminTokens = await Admin.find({ token: { $ne: null }, Role: { $ne: 'SuperAdmin' } }, 'token');
        
        const allTokens = [...userTokens, ...adminTokens].map(u => u.token).filter(t => t);
        
        if (allTokens.length > 0) {
          await TokenBlacklist.insertMany(allTokens.map(token => ({
            token,
            blacklistedAt: new Date(),
            reason: 'global_force_logout'
          })));
        }
      }
    } catch (error) {
      console.error('Blacklist error:', error);
    }
  };
}

module.exports = GlobalForceLogoutController;