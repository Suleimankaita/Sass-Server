const UserActivity = require('../Models/UserActivities');
const mongoose = require('mongoose');

// Create a new user activity
const createUserActivity = async (req, res) => {
  try {
    const { ActivityType, Username, img, ProductName } = req.body;
    
    // Validate required fields
    if (!ActivityType || !Username || !ProductName) {
      return res.status(400).json({
        success: false,
        message: 'ActivityType, Username, and ProductName are required'
      });
    }

    const newActivity = new UserActivity({
      ActivityType,
      Username,
      img: img || `https://ui-avatars.com/api/?name=${Username}&background=random`,
      ProductName
    });

    await newActivity.save();

    res.status(201).json({
      success: true,
      data: newActivity,
      message: 'Activity logged successfully'
    });
  } catch (error) {
    console.error('Error creating activity:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to log activity',
      error: error.message
    });
  }
};

// Get all user activities with filtering and pagination
const getActivities = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      search = '',
      activityType = '',
      username = '',
      startDate,
      endDate,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    // Build filter query
    const filter = {};
    
    if (search) {
      filter.$or = [
        { ProductName: { $regex: search, $options: 'i' } },
        { Username: { $regex: search, $options: 'i' } },
        { ActivityType: { $regex: search, $options: 'i' } }
      ];
    }
    
    if (activityType) {
      filter.ActivityType = activityType;
    }
    
    if (username) {
      filter.Username = username;
    }
    
    // Date range filtering
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) {
        filter.createdAt.$gte = new Date(startDate);
      }
      if (endDate) {
        filter.createdAt.$lte = new Date(endDate);
      }
    }

    // Parse pagination parameters
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // Sort configuration
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    // Execute query
    const [activities, total] = await Promise.all([
      UserActivity.find(filter)
        .sort(sort)
        .skip(skip)
        .limit(limitNum)
        .lean(),
      UserActivity.countDocuments(filter)
    ]);
    console.log(activities)

    // Transform data to match React component structure
    const transformedActivities = activities.map(activity => ({
      id: activity._id.toString(),
      user: activity.Username,
      role: this.getRoleFromActivity(activity.ActivityType), // Helper function
      action: activity.ActivityType,
      target: activity.ProductName,
      ip: '192.168.1.1', // Default or fetch from request headers
      time: activity.createdAt,
      status: this.getStatusFromActivity(activity.ActivityType), // Helper function
      details: this.generateDetails(activity), // Helper function
      img: activity.img
    }));

    res.json({
      success: true,
      data: transformedActivities,
      pagination: {
        currentPage: pageNum,
        totalPages: Math.ceil(total / limitNum),
        totalItems: total,
        itemsPerPage: limitNum
      }
    });
  } catch (error) {
    console.error('Error fetching activities:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch activities',
      error: error.message
    });
  }
};

// Get a single activity by ID
const getActivityById = async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid activity ID'
      });
    }

    const activity = await UserActivity.findById(id);
    
    if (!activity) {
      return res.status(404).json({
        success: false,
        message: 'Activity not found'
      });
    }

    // Transform to match React component structure
    const transformedActivity = {
      id: activity._id.toString(),
      user: activity.Username,
      role: this.getRoleFromActivity(activity.ActivityType),
      action: activity.ActivityType,
      target: activity.ProductName,
      ip: '192.168.1.1',
      time: activity.createdAt,
      status: this.getStatusFromActivity(activity.ActivityType),
      details: this.generateDetails(activity),
      img: activity.img,
      createdAt: activity.createdAt,
      updatedAt: activity.updatedAt
    };

    res.json({
      success: true,
      data: transformedActivity
    });
  } catch (error) {
    console.error('Error fetching activity:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch activity',
      error: error.message
    });
  }
};

// Get activity statistics
const getActivityStats = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    const filter = {};
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }

    const stats = await UserActivity.aggregate([
      { $match: filter },
      {
        $group: {
          _id: null,
          totalActivities: { $sum: 1 },
          uniqueUsers: { $addToSet: "$Username" },
          activityTypes: { $addToSet: "$ActivityType" }
        }
      },
      {
        $project: {
          totalActivities: 1,
          uniqueUsersCount: { $size: "$uniqueUsers" },
          activityTypes: 1
        }
      }
    ]);

    // Get hourly distribution
    const hourlyStats = await UserActivity.aggregate([
      { $match: filter },
      {
        $group: {
          _id: { $hour: "$createdAt" },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    res.json({
      success: true,
      data: {
        summary: stats[0] || { totalActivities: 0, uniqueUsersCount: 0, activityTypes: [] },
        hourlyDistribution: hourlyStats,
        recentActivities: await UserActivity.find(filter)
          .sort({ createdAt: -1 })
          .limit(5)
          .lean()
      }
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch statistics',
      error: error.message
    });
  }
};

// Export activities to CSV
const exportActivities = async (req, res) => {
  try {
    const { format = 'csv', startDate, endDate } = req.query;
    
    const filter = {};
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }

    const activities = await UserActivity.find(filter)
      .sort({ createdAt: -1 })
      .lean();

    if (format === 'csv') {
      // CSV headers
      const headers = ['Timestamp', 'User', 'Role', 'Action', 'Target', 'IP', 'Status', 'Details'];
      
      // Transform data
      const csvData = activities.map(activity => [
        new Date(activity.createdAt).toISOString(),
        activity.Username,
        this.getRoleFromActivity(activity.ActivityType),
        activity.ActivityType,
        activity.ProductName,
        '192.168.1.1',
        this.getStatusFromActivity(activity.ActivityType),
        this.generateDetails(activity)
      ]);

      // Convert to CSV string
      const csvContent = [
        headers.join(','),
        ...csvData.map(row => row.map(cell => `"${cell}"`).join(','))
      ].join('\n');

      res.header('Content-Type', 'text/csv');
      res.header('Content-Disposition', `attachment; filename=audit_logs_${Date.now()}.csv`);
      res.send(csvContent);
    } else if (format === 'json') {
      res.json({
        success: true,
        data: activities.map(activity => ({
          id: activity._id.toString(),
          user: activity.Username,
          role: this.getRoleFromActivity(activity.ActivityType),
          action: activity.ActivityType,
          target: activity.ProductName,
          ip: '192.168.1.1',
          time: activity.createdAt,
          status: this.getStatusFromActivity(activity.ActivityType),
          details: this.generateDetails(activity),
          img: activity.img
        }))
      });
    } else {
      res.status(400).json({
        success: false,
        message: 'Invalid format specified. Use "csv" or "json"'
      });
    }
  } catch (error) {
    console.error('Error exporting activities:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to export activities',
      error: error.message
    });
  }
};

// Helper function to determine role based on activity type
const getRoleFromActivity = (activityType) => {
  const roleMap = {
    'Login': 'Security',
    'Logout': 'Security',
    'Purchase': 'Customer',
    'Refund': 'Staff',
    'Inventory Update': 'Manager',
    'Price Change': 'Admin',
    'User Management': 'Admin',
    'System Maintenance': 'System'
  };
  
  return roleMap[activityType] || 'User';
};

// Helper function to determine status based on activity type
const getStatusFromActivity = (activityType) => {
  const successTypes = ['Purchase', 'Logout', 'Inventory Update', 'Price Change'];
  const failedTypes = ['Failed Login', 'Access Denied'];
  
  if (successTypes.includes(activityType)) return 'Success';
  if (failedTypes.includes(activityType)) return 'Failed';
  return 'Success';
};

// Helper function to generate details
const generateDetails = (activity) => {
  const detailsMap = {
    'Login': `User ${activity.Username} logged into the system`,
    'Logout': `User ${activity.Username} logged out of the system`,
    'Purchase': `${activity.Username} purchased ${activity.ProductName}`,
    'Refund': `Refund issued for ${activity.ProductName} by ${activity.Username}`,
    'Inventory Update': `Inventory updated for ${activity.ProductName}`,
    'Price Change': `Price modified for ${activity.ProductName}`,
    'User Management': `User account modified by ${activity.Username}`,
    'System Maintenance': `System maintenance performed`
  };
  
  return detailsMap[activity.ActivityType] || `Activity: ${activity.ActivityType} performed by ${activity.Username}`;
};

// Delete an activity (admin only)
const deleteActivity = async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid activity ID'
      });
    }

    const activity = await UserActivity.findByIdAndDelete(id);
    
    if (!activity) {
      return res.status(404).json({
        success: false,
        message: 'Activity not found'
      });
    }

    res.json({
      success: true,
      message: 'Activity deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting activity:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete activity',
      error: error.message
    });
  }
};

// Get unique values for filters
const getFilterOptions = async (req, res) => {
  try {
    const [usernames, activityTypes] = await Promise.all([
      UserActivity.distinct('Username'),
      UserActivity.distinct('ActivityType')
    ]);

    res.json({
      success: true,
      data: {
        usernames: usernames.sort(),
        activityTypes: activityTypes.sort(),
        roles: ['Admin', 'Manager', 'Staff', 'Customer', 'Security', 'System']
      }
    });
  } catch (error) {
    console.error('Error fetching filter options:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch filter options',
      error: error.message
    });
  }
};

module.exports = {
  createUserActivity,
  getActivities,
  getActivityById,
  getActivityStats,
  exportActivities,
  deleteActivity,
  getFilterOptions,
  getRoleFromActivity,
  getStatusFromActivity,
  generateDetails
};