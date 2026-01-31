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
      // const {  } = req.body;
      const reason = 'Global force logout initiated by SuperAdmin'
      // 🔐 1. Strict Authorization
      if (Role !== 'SuperAdmin') {
        return res.status(403).json({ success: false, message: 'Only SuperAdmin can perform this action' });
      }

      const stats = { userProfileCleared: 0, companyUsersCleared: 0, adminUsersCleared: 0, sessionsTerminated: 0 };

      // 🔍 STEP 1: Identify ALL SuperAdmins and their UserProfileIds to protect them
      const superAdminUsers = await Admin.find({ Role: 'SuperAdmin' }, 'UserProfileId _id').lean();
      
      // Get SuperAdmin IDs (Admin collection) and their linked UserProfile IDs
      const superAdminIds = superAdminUsers.map(admin => admin._id.toString());
      const superAdminUserProfileIds = superAdminUsers
        .map(admin => admin.UserProfileId?.toString())
        .filter(id => id); // Remove null/undefined

      // 2️⃣ CLEAR USERPROFILES (Excluding UserProfiles linked to SuperAdmins)
      const userProfileResult = await UserProfile.updateMany(
        { 
          token: { $ne: null }, 
          _id: { $nin: superAdminUserProfileIds } // Protect UserProfiles linked to SuperAdmins
        },
        { $set: { token: null, updatedAt: new Date() } }
      );
      stats.userProfileCleared = userProfileResult.modifiedCount;

      // 3️⃣ CLEAR COMPANY USERS 
      if (mongoose.modelNames().includes('CompanyUsers')) {
        const CompanyUsers = mongoose.model('CompanyUsers');
        const companyUsersResult = await CompanyUsers.updateMany(
          { 
            token: { $ne: null },
            // If CompanyUsers has UserProfileId field, use it
            ...(CompanyUsers.schema.path('UserProfileId') && {
              UserProfileId: { $nin: superAdminUserProfileIds }
            })
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

      // 5️⃣ TERMINATE SESSIONS (Excluding sessions for SuperAdmins)
      // We need to exclude sessions for both SuperAdmin IDs and their linked UserProfile IDs
      const excludedSessionUserIds = [...superAdminIds, ...superAdminUserProfileIds];
      
      const sessionResult = await SecurityCompliance.updateMany(
        {
          DataType: 'session',
          IsSessionActive: true,
          UserId: { $nin: excludedSessionUserIds } // Protect SuperAdmin sessions
        },
        {
          $set: {
            IsSessionActive: false,
            SessionType: 'global_force_logout', 
            TerminatedAt: new Date(),
            TerminatedBy: userId,
            TerminationReason: reason
          }
        }
      );
      stats.sessionsTerminated = sessionResult.modifiedCount;

      // 6️⃣ BLACKLIST TOKENS (Passing the protection list)
      await this.blacklistAllTokens(superAdminIds, superAdminUserProfileIds);

      // 7️⃣ LOG ACTION
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
        data: { 
          ...stats, 
          protectedSuperAdmins: superAdminIds.length,
          protectedUserProfiles: superAdminUserProfileIds.length 
        }
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

      // Identify SuperAdmins and their UserProfileIds to exclude
      const superAdminUsers = await Admin.find({ Role: 'SuperAdmin' }, 'UserProfileId _id').lean();
      const superAdminIds = superAdminUsers.map(admin => admin._id.toString());
      const superAdminUserProfileIds = superAdminUsers
        .map(admin => admin.UserProfileId?.toString())
        .filter(id => id);

      let model;
      let filter = { token: { $ne: null } };
      
      if (userType === 'Admin') {
        model = Admin;
        filter.Role = { $ne: 'SuperAdmin' };
      } else if (userType === 'UserProfile') {
        model = UserProfile;
        filter._id = { $nin: superAdminUserProfileIds };
      } else if (userType === 'CompanyUsers') {
        model = mongoose.model('CompanyUsers');
        // If CompanyUsers has UserProfileId field, use it
        if (model.schema.path('UserProfileId')) {
          filter.UserProfileId = { $nin: superAdminUserProfileIds };
        }
      } else {
        return res.status(400).json({ success: false, message: 'Invalid user type' });
      }

      const updateResult = await model.updateMany(filter, { $set: { token: null, updatedAt: new Date() } });

      res.status(200).json({ 
        success: true, 
        message: `Logged out all ${userType} (SuperAdmins protected)`, 
        cleared: updateResult.modifiedCount 
      });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  };

  // Method 3: Logout specific user (Excluding SuperAdmin)
  static clearTokenByUserId = async (req, res) => {
    try {
      const { Role, userId } = req.user;
      const { targetUserId, userType } = req.body;

      if (Role !== 'SuperAdmin') return res.status(403).json({ success: false, message: 'Unauthorized' });

      const model = userType === 'Admin' ? Admin : 
                    userType === 'UserProfile' ? UserProfile : 
                    mongoose.model('CompanyUsers');
      
      const targetUser = await model.findById(targetUserId);

      if (!targetUser) return res.status(404).json({ success: false, message: 'User not found' });

      // 🛡️ Security Guard: Check if the target is a SuperAdmin or linked to one
      if (userType === 'Admin') {
        if (targetUser.Role === 'SuperAdmin') {
          return res.status(403).json({ success: false, message: 'Cannot force logout a SuperAdmin account' });
        }
      } else if (userType === 'UserProfile') {
        // Check if this UserProfile is linked to a SuperAdmin
        const linkedSuperAdmin = await Admin.findOne({ 
          UserProfileId: targetUserId, 
          Role: 'SuperAdmin' 
        });
        if (linkedSuperAdmin) {
          return res.status(403).json({ 
            success: false, 
            message: 'Cannot force logout a UserProfile linked to a SuperAdmin account' 
          });
        }
      } else if (userType === 'CompanyUsers') {
        // If CompanyUsers has UserProfileId, check if linked to SuperAdmin
        if (targetUser.UserProfileId) {
          const linkedSuperAdmin = await Admin.findOne({ 
            UserProfileId: targetUser.UserProfileId, 
            Role: 'SuperAdmin' 
          });
          if (linkedSuperAdmin) {
            return res.status(403).json({ 
              success: false, 
              message: 'Cannot force logout a Company User linked to a SuperAdmin account' 
            });
          }
        }
      }

      await model.findByIdAndUpdate(targetUserId, { $set: { token: null, updatedAt: new Date() } });
      res.status(200).json({ success: true, message: 'User token cleared' });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  };

  // ============ HELPER METHODS ============

  static blacklistAllTokens = async (excludedAdminIds = [], excludedUserProfileIds = []) => {
    try {
      if (mongoose.modelNames().includes('TokenBlacklist')) {
        const TokenBlacklist = mongoose.model('TokenBlacklist');
        
        // Get UserProfile tokens (excluding those linked to SuperAdmins)
        const userTokens = await UserProfile.find({ 
          token: { $ne: null }, 
          _id: { $nin: excludedUserProfileIds } 
        }, 'token');
        
        // Get Admin tokens (excluding SuperAdmins)
        const adminTokens = await Admin.find({ 
          token: { $ne: null }, 
          Role: { $ne: 'SuperAdmin' } 
        }, 'token');
        
        const allTokens = [...userTokens, ...adminTokens]
          .map(u => u.token)
          .filter(t => t && t.trim() !== '');
        
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