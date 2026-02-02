const asyncHandler = require('express-async-handler');
const Notification = require('../Models/NotificationsCenter');

const MarkNotificationSeen = asyncHandler(async (req, res) => {
  const userId = req.userId;
  const { id} = req.body;

  console.log(id)
  if (!userId || !id) {
    return res.status(400).json({
      success: false,
      message: 'UserId andare required',
    });
  }

  const notification = await Notification.findOne({
    _id: id,
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
    id: notification._id,
  });
});

module.exports = MarkNotificationSeen;
