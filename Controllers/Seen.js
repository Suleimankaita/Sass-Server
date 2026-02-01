const asyncHandler = require('express-async-handler');
const Notification = require('../Models/NotificationsCenter');

const MarkNotificationSeen = asyncHandler(async (req, res) => {
  const userId = req.userId;
  const { id:notificationId } = req.body;

  console.log(notificationId)
  if (!userId || !notificationId) {
    return res.status(400).json({
      success: false,
      message: 'UserId and NotificationId are required',
    });
  }

  const notification = await Notification.findOne({
    _id: notificationId,
    status: 'SENT',        // ✅ Only SENT can be seen
  });

  if (!notification) {
    return res.status(404).json({
      success: false,
      message: 'Notification not found or not sent yet',
    });
  }

  if (notification.seen === true) {
    return res.status(200).json({
      success: true,
      message: 'Notification already marked as seen',
    });
  }

  notification.seen = true;
  notification.seenAt = new Date();

  await notification.save();

  res.status(200).json({
    success: true,
    message: 'Notification marked as seen',
    notificationId: notification._id,
  });
});

module.exports = MarkNotificationSeen;
