const asyncHandler = require('express-async-handler');
const User = require('../Models/User');
const CompanyUser = require('../Models/CompanyUsers');
const Admin = require('../Models/AdminOwner');

const GetUserNotification = asyncHandler(async (req, res) => {
  const id = req.userId;

  if (!id) {
    return res.status(400).json({
      success: false,
      message: 'UserId required',
    });
  }

  let user = null;

  const populateConfig = {
    path: 'UserProfileId',
    populate: {
      path: 'NotificationId',
      model: 'Notification',
      options: { sort: { createdAt: -1 } }, // newest first
    },
  };

  // 1️⃣ Try User
  user = await User.findById(id).populate(populateConfig).lean();

  // 2️⃣ Try CompanyUser
  if (!user) {
    user = await CompanyUser.findById(id).populate(populateConfig).lean();
  }

  // 3️⃣ Try Admin
  if (!user) {
    user = await Admin.findById(id).populate(populateConfig).lean();
  }

  if (!user || !user.UserProfileId) {
    return res.status(404).json({
      success: false,
      message: 'User not found',
    });
  }

  const allNotifications = user.UserProfileId.NotificationId || [];

  // ✅ ONLY SHOW SENT NOTIFICATIONS
  const sentNotifications = allNotifications.filter(
    n => n.status === 'SENT'
  );

  // ✅ SEEN / UNSEEN (ONLY FROM SENT)
  const unseenNotifications = sentNotifications.filter(n => n.seen === false);
  const seenNotifications = sentNotifications.filter(n => n.seen === true);

  res.status(200).json({
    success: true,
    total: sentNotifications.length,
    unseenCount: unseenNotifications.length,
    seenCount: seenNotifications.length,
    unseenNotifications,
    seenNotifications,
    notifications: sentNotifications, // audience-safe list
  });
});

module.exports = GetUserNotification;
