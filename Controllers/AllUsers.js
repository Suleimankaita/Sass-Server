// controllers/userAccessController.js
const mongoose = require('mongoose');
const User = require('../Models/User');
const Admin = require('../Models/AdminOwner');
const CompanyUser = require('../Models/CompanyUsers');
const UserProfile = require('../Models/Userprofile');
const UserLog = require('../Models/UserLog'); // Assuming you have this model
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

// Generate a random wallet number
const generateWalletNumber = () => {
    return Math.floor(100000 + Math.random() * 900000);
};

// Generate a random password
const generatePassword = () => {
    return crypto.randomBytes(8).toString('hex');
};

// =====================================================================
// 1. GET ALL USERS (Combined Users, Admins, Company Users)
// =====================================================================
const getAllUsers = async (req, res) => {
    try {
        // Get all users with their profiles
        const users = await User.find()
            .populate('UserProfileId', 'fullName Email phone profileImage walletBalance')
            .select('Firstname Lastname Username WalletNumber WalletBalance Role Active createdAt')
            .sort({ createdAt: -1 });

        // Get all admins with their profiles
        const admins = await Admin.find()
            .populate('UserProfileId', 'fullName Email phone profileImage walletBalance')
            .select('Username Role Active Verified companyId walletBalance createdAt')
            .sort({ createdAt: -1 });

        // Get all company users with their profiles
        const companyUsers = await CompanyUser.find()
            .populate('UserProfileId', 'fullName Email phone profileImage walletBalance')
            .populate('companyId', 'CompanyName')
            .select('Firstname Lastname Username Email CompanyName Role Active companyId walletBalance createdAt')
            .sort({ createdAt: -1 });

        // Format the response to match frontend structure
        const formattedUsers = users.map(user => ({
            id: user._id,
            type: 'user',
            name: `${user.Firstname} ${user.Lastname}`,
            email: user.UserProfileId?.Email || 'No email',
            role: user.Role,
            status: user.Active ? 'ACTIVE' : 'SUSPENDED',
            scope: user.Role === 'User' ? 'Limited Access' : 'Full Access',
            lastLogin: '1m ago', // You would get this from UserLog
            sessions: 0, // You would track this separately
            ip: '192.168.1.1', // You would get this from UserLog
            walletBalance: user.WalletBalance || 0,
            createdAt: user.createdAt
        }));

        const formattedAdmins = admins.map(admin => ({
            id: admin._id,
            type: 'admin',
            name: admin.Username,
            email: admin.UserProfileId?.Email || 'No email',
            role: admin.Role,
            status: admin.Active ? 'ACTIVE' : 'SUSPENDED',
            scope: admin.Role === 'Super Admin' ? 'Full Access' : 'Limited Access',
            lastLogin: '1m ago',
            sessions: 0,
            ip: '192.168.1.1',
            walletBalance: admin.walletBalance?.[0] || 0,
            isSuper: admin.Role === 'Super Admin',
            createdAt: admin.createdAt
        }));

        const formattedCompanyUsers = companyUsers.map(companyUser => ({
            id: companyUser._id,
            type: 'company_user',
            name: `${companyUser.Firstname} ${companyUser.Lastname}`,
            email: companyUser.Email,
            company: companyUser.companyId?.CompanyName || 'No company',
            role: companyUser.Role,
            status: companyUser.Active ? 'ACTIVE' : 'SUSPENDED',
            scope: companyUser.Role,
            lastLogin: '1m ago',
            sessions: 0,
            ip: '192.168.1.1',
            walletBalance: companyUser.walletBalance?.[0] || 0,
            createdAt: companyUser.createdAt
        }));

        // Get admin accounts for the admin panel
        const adminAccounts = admins.map(admin => ({
            id: admin._id,
            name: admin.Username,
            platform: admin.companyId ? 'Tenant Admin' : 'Platform Admin',
            lastActive: '1m ago',
            permissionScopes: admin.Role === 'Super Admin' ? 'Full Access' : 'Limited Access',
            isSuper: admin.Role === 'Super Admin'
        }));

        res.status(200).json({
            success: true,
            data: {
                users: [...formattedUsers, ...formattedAdmins, ...formattedCompanyUsers],
                admins: adminAccounts,
                stats: {
                    totalUsers: formattedUsers.length,
                    totalAdmins: formattedAdmins.length,
                    totalCompanyUsers: formattedCompanyUsers.length,
                    activeUsers: [...formattedUsers, ...formattedAdmins, ...formattedCompanyUsers].filter(u => u.status === 'ACTIVE').length,
                    suspendedUsers: [...formattedUsers, ...formattedAdmins, ...formattedCompanyUsers].filter(u => u.status === 'SUSPENDED').length
                }
            }
        });
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch users',
            error: error.message
        });
    }
};

// =====================================================================
// 2. GET USER BY ID (With Detailed Information)
// =====================================================================
const getUserById = async (req, res) => {
    try {
        const { id } = req.params;
        
        // Try to find user in all collections
        let user = await User.findById(id)
            .populate('UserProfileId')
            .populate('UserLogId');

        if (!user) {
            user = await Admin.findById(id)
                .populate('UserProfileId')
                .populate('UserLogId');
        }

        if (!user) {
            user = await CompanyUser.findById(id)
                .populate('UserProfileId')
                .populate('companyId')
                .populate('LogId');
        }

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Get user logs/activities
        const userLogs = await UserLog.find({ 
            userId: id 
        }).sort({ createdAt: -1 }).limit(20);

        // Format user details
        const userDetails = {
            id: user._id,
            name: user.Firstname && user.Lastname 
                ? `${user.Firstname} ${user.Lastname}` 
                : user.Username || 'Unknown',
            email: user.Email || user.UserProfileId?.Email || 'No email',
            role: user.Role || 'User',
            status: user.Active ? 'ACTIVE' : 'SUSPENDED',
            scope: user.Role === 'Super Admin' ? 'Full Access' : 
                   user.Role === 'Admin' ? 'Admin Access' : 
                   user.Role === 'User' ? 'User Access' : user.Role,
            walletNumber: user.WalletNumber,
            walletBalance: user.WalletBalance || user.walletBalance?.[0] || 0,
            lastLogin: userLogs.length > 0 ? userLogs[0].createdAt : 'Never',
            sessions: 0, // You would need to track active sessions
            ip: userLogs.length > 0 ? userLogs[0].ipAddress : 'N/A',
            company: user.companyId?.CompanyName || 'N/A',
            createdAt: user.createdAt,
            logs: userLogs.map(log => ({
                id: log._id,
                timestamp: log.createdAt,
                action: log.action,
                ip: log.ipAddress,
                status: log.status,
                details: log.details
            }))
        };

        res.status(200).json({
            success: true,
            data: userDetails
        });
    } catch (error) {
        console.error('Error fetching user:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch user details',
            error: error.message
        });
    }
};

// =====================================================================
// 3. CREATE NEW USER
// =====================================================================
const createUser = async (req, res) => {
  try {
    const {
      name,
      email,
      role,
      type = 'user',
      companyId,
      phone,
      password
    } = req.body;

    if (!name || !email || !role) {
      return res.status(400).json({
        success: false,
        message: 'Name, email, and role are required'
      });
    }

    const normalizedEmail = email.toLowerCase();
    const username = normalizedEmail.split('@')[0];

    // Check if email already exists in UserProfile
    const existingProfile = await UserProfile.findOne({ Email: normalizedEmail });
    if (existingProfile) {
      return res.status(400).json({
        success: false,
        message: 'Email already exists'
      });
    }

    const [firstName, ...lastNameParts] = name.trim().split(' ');
    const lastName = lastNameParts.join(' ') || '';

    // Pre-check users BEFORE creating profile
    if (type.toLowerCase() === 'admin') {
      const found = await Admin.findOne({ Usernane: username }).exec();
      if (found) return res.status(409).json({ message: "User is Already" });

      if (role === 'Admin' && !companyId) {
        return res.status(400).json({
          success: false,
          message: 'Company ID is required for Admin role'
        });
      }
    }

    if (type.toLowerCase() === 'company_user') {
      const foundComUser = await CompanyUser.findOne({ Usernane: username }).exec();
      if (foundComUser) return res.status(409).json({ message: "User is Already" });

      if (!companyId) {
        return res.status(400).json({
          success: false,
          message: 'Company ID is required for company user'
        });
      }
    }

    if (type.toLowerCase() === 'user') {
      const foundUser = await User.findOne({ Usernane: username }).exec();
      if (foundUser) return res.status(409).json({ message: "User is Already" });
    }

    // Create UserProfile
    const userProfile = new UserProfile({
      fullName: name,
      Email: normalizedEmail,
      phone: phone || '',
      password: await bcrypt.hash(
        password || generatePassword(),
        10
      ),
      walletNumber: generateWalletNumber(),
      walletBalance: [0]
    });

    await userProfile.save();

    let newUser;

    switch (type.toLowerCase()) {
      case 'admin':
        newUser = new Admin({
          Username: username,
          Password: userProfile.password,
          UserProfileId: userProfile._id,
          Role: role,
          companyId: companyId || null,
          walletBalance: [0]
        });
        break;

      case 'company_user':
        newUser = new CompanyUser({
          Firstname: firstName,
          Lastname: lastName,
          Username: username,
          Email: normalizedEmail,
          Password: userProfile.password,
          UserProfileId: userProfile._id,
          companyId,
          Role: role,
          walletBalance: [0]
        });
        break;

      default:
        newUser = new User({
          Firstname: firstName,
          Lastname: lastName,
          Username: username,
          WalletNumber: userProfile.walletNumber,
          WalletBalance: 0,
          UserProfileId: userProfile._id,
          Role: role
        });
        break;
    }

    await newUser.save();

    // Log
    const userLog = new UserLog({
      userId: newUser._id,
      action: 'ACCOUNT_CREATED',
      ipAddress: req.ip || '127.0.0.1',
      status: 'SUCCESS',
      details: `User account created by ${req.user?.Username || 'system'}`
    });

    await userLog.save();

    res.status(201).json({
      success: true,
      message: 'User created successfully',
      data: {
        id: newUser._id,
        name,
        email: normalizedEmail,
        role,
        type,
        status: 'ACTIVE',
        walletNumber: userProfile.walletNumber
      }
    });

  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create user',
      error: error.message
    });
  }
};


// =====================================================================
// 4. UPDATE USER ROLE
// =====================================================================
const updateUserRole = async (req, res) => {
    try {
        const { id } = req.params;
        const { Role } = req.body;
        if (!Role) {
            return res.status(400).json({
                success: false,
                message: 'Role is required'
            });
        }

        // Try to find and update user in all collections
        let updatedUser = await User.findByIdAndUpdate(
            id,
            { Role: Role },
            { new: true }
        );

        if (!updatedUser) {
            updatedUser = await Admin.findByIdAndUpdate(
                id,
                { Role: Role },
                { new: true }
            );
        }

        if (!updatedUser) {
            updatedUser = await CompanyUser.findByIdAndUpdate(
                id,
                { Role: Role },
                { new: true }
            );
        }

        if (!updatedUser) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Create a user log for role update
        const userLog = new UserLog({
            userId: id,
            action: 'ROLE_UPDATED',
            ipAddress: req.ip || '127.0.0.1',
            status: 'SUCCESS',
            details: `Role updated to ${Role} by ${req.user?.Username || 'system'}`
        });
        await userLog.save();

        res.status(200).json({
            success: true,
            message: 'User role updated successfully',
            data: {
                id: updatedUser._id,
                role: updatedUser.Role
            }
        });
    } catch (error) {
        console.error('Error updating user role:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update user role',
            error: error.message
        });
    }
};

// =====================================================================
// 5. UPDATE USER STATUS (ACTIVE/SUSPENDED)
// =====================================================================
const updateUserStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        if (!status || !['ACTIVE', 'SUSPENDED'].includes(status)) {
            return res.status(400).json({
                success: false,
                message: 'Valid status (ACTIVE/SUSPENDED) is required'
            });
        }

        const active = status === 'ACTIVE';

        // Try to find and update user in all collections
        let updatedUser = await User.findByIdAndUpdate(
            id,
            { Active: active },
            { new: true }
        );

        if (!updatedUser) {
            updatedUser = await Admin.findByIdAndUpdate(
                id,
                { Active: active },
                { new: true }
            );
        }

        if (!updatedUser) {
            updatedUser = await CompanyUser.findByIdAndUpdate(
                id,
                { Active: active },
                { new: true }
            );
        }

        if (!updatedUser) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Create a user log for status update
        const userLog = new UserLog({
            userId: id,
            action: 'STATUS_UPDATED',
            ipAddress: req.ip || '127.0.0.1',
            status: 'SUCCESS',
            details: `Account ${status.toLowerCase()} by ${req.user?.Username || 'system'}`
        });
        await userLog.save();

        res.status(200).json({
            success: true,
            message: `User account ${status.toLowerCase()} successfully`,
            data: {
                id: updatedUser._id,
                status: status,
                active: updatedUser.Active
            }
        });
    } catch (error) {
        console.error('Error updating user status:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update user status',
            error: error.message
        });
    }
};

// =====================================================================
// 6. FORCE LOGOUT USER (Terminate All Sessions)
// =====================================================================
const forceLogoutUser = async (req, res) => {
    try {
        const { id } = req.params;

        // Create a user log for forced logout
        const userLog = new UserLog({
            userId: id,
            action: 'FORCED_LOGOUT',
            ipAddress: req.ip || '127.0.0.1',
            status: 'SUCCESS',
            details: `All sessions terminated by ${req.user?.Username || 'system'}`
        });
        await userLog.save();

        // In a real application, you would:
        // 1. Invalidate all JWT tokens for this user
        // 2. Clear session data from Redis/Session store
        // 3. Send WebSocket notification to connected devices

        res.status(200).json({
            success: true,
            message: 'User logged out from all sessions',
            data: {
                id: id,
                sessions: 0,
                logoutTime: new Date()
            }
        });
    } catch (error) {
        console.error('Error forcing user logout:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to force logout user',
            error: error.message
        });
    }
};

// =====================================================================
// 7. DELETE USER
// =====================================================================
const deleteUser = async (req, res) => {
    try {
        const { id } = req.params;
        const { confirmation } = req.body;

        // Double confirmation check
        if (confirmation !== 'DELETE') {
            return res.status(400).json({
                success: false,
                message: 'Confirmation text "DELETE" is required'
            });
        }

        // Try to find user in all collections to get their profile ID
        let user = await User.findById(id);
        let profileId = user?.UserProfileId;

        if (!user) {
            user = await Admin.findById(id);
            profileId = user?.UserProfileId;
        }

        if (!user) {
            user = await CompanyUser.findById(id);
            profileId = user?.UserProfileId;
        }

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Delete user from their collection
        if (user.constructor.modelName === 'YS_store_Users') {
            await User.findByIdAndDelete(id);
        } else if (user.constructor.modelName === 'Admin') {
            await Admin.findByIdAndDelete(id);
        } else if (user.constructor.modelName === 'Company_User') {
            await CompanyUser.findByIdAndDelete(id);
        }

        // Delete associated user profile if it exists and no other users reference it
        if (profileId) {
            const userCount = await User.countDocuments({ UserProfileId: profileId });
            const adminCount = await Admin.countDocuments({ UserProfileId: profileId });
            const companyUserCount = await CompanyUser.countDocuments({ UserProfileId: profileId });
            
            if (userCount === 0 && adminCount === 0 && companyUserCount === 0) {
                await UserProfile.findByIdAndDelete(profileId);
            }
        }

        // Create a user log for deletion
        const userLog = new UserLog({
            userId: id,
            action: 'ACCOUNT_DELETED',
            ipAddress: req.ip || '127.0.0.1',
            status: 'SUCCESS',
            details: `Account permanently deleted by ${req.user?.Username || 'system'}`
        });
        await userLog.save();

        res.status(200).json({
            success: true,
            message: 'User permanently deleted',
            data: {
                id: id,
                deletedAt: new Date()
            }
        });
    } catch (error) {
        console.error('Error deleting user:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete user',
            error: error.message
        });
    }
};

// =====================================================================
// 8. GET USER ACTIVITY LOGS
// =====================================================================
const getUserActivityLogs = async (req, res) => {
    try {
        const { id } = req.params;
        const { limit = 50, page = 1 } = req.query;

        const skip = (page - 1) * limit;

        // Get user logs
        const logs = await UserLog.find({ userId: id })
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(parseInt(limit));

        const totalLogs = await UserLog.countDocuments({ userId: id });

        res.status(200).json({
            success: true,
            data: {
                logs: logs.map(log => ({
                    id: log._id,
                    timestamp: log.createdAt,
                    action: log.action,
                    ip: log.ipAddress,
                    status: log.status,
                    details: log.details
                })),
                pagination: {
                    total: totalLogs,
                    page: parseInt(page),
                    limit: parseInt(limit),
                    pages: Math.ceil(totalLogs / limit)
                }
            }
        });
    } catch (error) {
        console.error('Error fetching user logs:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch user activity logs',
            error: error.message
        });
    }
};

// =====================================================================
// 9. GET PLATFORM STATISTICS
// =====================================================================
const getPlatformStatistics = async (req, res) => {
    try {
        // Get counts from all collections
        const totalUsers = await User.countDocuments();
        const totalAdmins = await Admin.countDocuments();
        const totalCompanyUsers = await CompanyUser.countDocuments();

        // Get active counts
        const activeUsers = await User.countDocuments({ Active: true });
        const activeAdmins = await Admin.countDocuments({ Active: true });
        const activeCompanyUsers = await CompanyUser.countDocuments({ Active: true });

        // Get today's registrations
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const todayUsers = await User.countDocuments({ createdAt: { $gte: today } });
        const todayAdmins = await Admin.countDocuments({ createdAt: { $gte: today } });
        const todayCompanyUsers = await CompanyUser.countDocuments({ createdAt: { $gte: today } });

        // Get role distribution
        const userRoles = await User.aggregate([
            { $group: { _id: '$Role', count: { $sum: 1 } } }
        ]);

        const adminRoles = await Admin.aggregate([
            { $group: { _id: '$Role', count: { $sum: 1 } } }
        ]);

        const companyUserRoles = await CompanyUser.aggregate([
            { $group: { _id: '$Role', count: { $sum: 1 } } }
        ]);

        res.status(200).json({
            success: true,
            data: {
                totals: {
                    users: totalUsers,
                    admins: totalAdmins,
                    companyUsers: totalCompanyUsers,
                    all: totalUsers + totalAdmins + totalCompanyUsers
                },
                active: {
                    users: activeUsers,
                    admins: activeAdmins,
                    companyUsers: activeCompanyUsers,
                    all: activeUsers + activeAdmins + activeCompanyUsers
                },
                today: {
                    users: todayUsers,
                    admins: todayAdmins,
                    companyUsers: todayCompanyUsers,
                    all: todayUsers + todayAdmins + todayCompanyUsers
                },
                roles: {
                    users: userRoles,
                    admins: adminRoles,
                    companyUsers: companyUserRoles
                }
            }
        });
    } catch (error) {
        console.error('Error fetching platform statistics:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch platform statistics',
            error: error.message
        });
    }
};

// =====================================================================
// 10. SEARCH USERS
// =====================================================================
const searchUsers = async (req, res) => {
    try {
        const { query } = req.query;

        if (!query || query.length < 2) {
            return res.status(400).json({
                success: false,
                message: 'Search query must be at least 2 characters'
            });
        }

        // Search in all collections
        const users = await User.find({
            $or: [
                { Firstname: { $regex: query, $options: 'i' } },
                { Lastname: { $regex: query, $options: 'i' } },
                { Username: { $regex: query, $options: 'i' } }
            ]
        })
        .populate('UserProfileId', 'Email')
        .limit(20);

        const admins = await Admin.find({
            Username: { $regex: query, $options: 'i' }
        })
        .populate('UserProfileId', 'Email')
        .limit(20);

        const companyUsers = await CompanyUser.find({
            $or: [
                { Firstname: { $regex: query, $options: 'i' } },
                { Lastname: { $regex: query, $options: 'i' } },
                { Username: { $regex: query, $options: 'i' } },
                { Email: { $regex: query, $options: 'i' } }
            ]
        })
        .populate('UserProfileId', 'Email')
        .populate('companyId', 'CompanyName')
        .limit(20);

        // Also search in UserProfile for email
        const profiles = await UserProfile.find({
            Email: { $regex: query, $options: 'i' }
        })
        .limit(20);

        const profileIds = profiles.map(p => p._id);

        const usersByProfile = await User.find({ UserProfileId: { $in: profileIds } })
            .populate('UserProfileId', 'Email')
            .limit(20);

        const adminsByProfile = await Admin.find({ UserProfileId: { $in: profileIds } })
            .populate('UserProfileId', 'Email')
            .limit(20);

        const companyUsersByProfile = await CompanyUser.find({ UserProfileId: { $in: profileIds } })
            .populate('UserProfileId', 'Email')
            .populate('companyId', 'CompanyName')
            .limit(20);

        // Combine all results
        const allResults = [
            ...users,
            ...admins,
            ...companyUsers,
            ...usersByProfile,
            ...adminsByProfile,
            ...companyUsersByProfile
        ];

        // Remove duplicates
        const uniqueResults = Array.from(new Set(allResults.map(u => u._id.toString())))
            .map(id => allResults.find(u => u._id.toString() === id));

        // Format results
        const formattedResults = uniqueResults.map(user => {
            const isUser = user.constructor.modelName === 'YS_store_Users';
            const isAdmin = user.constructor.modelName === 'Admin';
            const isCompanyUser = user.constructor.modelName === 'Company_User';

            return {
                id: user._id,
                type: isUser ? 'user' : isAdmin ? 'admin' : 'company_user',
                name: isUser ? `${user.Firstname} ${user.Lastname}` : 
                      isCompanyUser ? `${user.Firstname} ${user.Lastname}` : user.Username,
                email: isCompanyUser ? user.Email : user.UserProfileId?.Email,
                role: user.Role,
                status: user.Active ? 'ACTIVE' : 'SUSPENDED',
                company: isCompanyUser ? user.companyId?.CompanyName : 
                          isAdmin ? (user.companyId ? 'Tenant Admin' : 'Platform Admin') : 'N/A'
            };
        });

        res.status(200).json({
            success: true,
            data: {
                results: formattedResults,
                count: formattedResults.length
            }
        });
    } catch (error) {
        console.error('Error searching users:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to search users',
            error: error.message
        });
    }
};

module.exports = {
    getAllUsers,
    getUserById,
    createUser,
    updateUserRole,
    updateUserStatus,
    forceLogoutUser,
    deleteUser,
    getUserActivityLogs,
    getPlatformStatistics,
    searchUsers
};