const cron = require('node-cron');
const UserProfile = require("../Models/Userprofile"); // Ensure this is imported
const Notification = require('../Models/NotificationsCenter');
const User= require('../Models/User');
const Admin= require('../Models/AdminOwner');
const CompanyUsers= require('../Models/CompanyUsers');

// Helper to emit in-app notifications via socket.io
async function emitNotification(io, notif) {
  if (!io) return;
  // Broadcast global notification
  io.emit('notification', notif);
  // Also emit to rooms for each target (clients can join rooms like `target:POS Users`)
  if (Array.isArray(notif.targets)) {
    notif.targets.forEach(target => {
      try { io.to(`target:${target}`).emit('notification', notif); } catch (e) { /* noop */ }
    });
  }
}


// This function runs every minute automatically

exports.create = async (req, res, next) => {
  try {
    const {
      title,
      message,
      category,
      targets = [],
      channels = { email: true, inApp: true },
      publishAt
    } = req.body;

    if (!title || !message) {
      return res.status(400).json({ success: false, message: "title/message required" });
    }

    // 1. Create the Notification entry first
    const notif = await Notification.create({
      title,
      message,
      category,
      targets,
      channels,
      publishAt: publishAt || null
    });

    /* ---------------- FIND RECIPIENT PROFILE IDs ---------------- */
    
    let queryFilters = [];
    
    // Logic to decide which UserProfiles to target
    if (targets.length === 0) {
      // If no targets, we fetch everyone's Profile ID
      const [u, a, c] = await Promise.all([
        User.find().select("UserProfileId").exec(),
        Admin.find().select("UserProfileId").exec(),
        CompanyUsers.find().select("UserProfileId").exec()
      ]);
      queryFilters = [...u, ...a, ...c];
    } else {
      if (targets.includes("Ecommerce Users")) {
        const users = await User.find().select("UserProfileId").exec();
        queryFilters.push(...users);
      }
      if (targets.includes("POS Admins")) {
        const admins = await Admin.find({ Role: "Admin", }).select("UserProfileId").exec();
        queryFilters.push(...admins);
      }
      if (targets.includes("POS Users")) {
        const cus = await CompanyUsers.find().select("UserProfileId").exec();
        
        queryFilters.push(...cus);
      }
    }

    // Extract just the ObjectIds of the UserProfiles
    const profileIds = [...new Set(queryFilters
      .map(item => item.UserProfileId)
      .filter(id => id != null)
    )];


    /* ---------------- BULK DATABASE UPDATE ---------------- */
    if (profileIds.length > 0) {
      // 🔥 The Fix: Use updateMany with $addToSet 
      // This pushes the notification ID into the NotificationId array for all users at once
      await UserProfile.updateMany(
        { _id: { $in: profileIds } },
        { $addToSet: { NotificationId: notif._id } }
      );
    }

    /* ---------------- EMIT & RESPOND ---------------- */

    const isImmediate = !publishAt || new Date(publishAt) <= new Date();

    if (isImmediate) {
      notif.status = "SENT";
      notif.sentAt = new Date();
      await notif.save();

      // Ensure your emit function is actually broadcasting
      if (req.io) {
        await emitNotification(req.io, notif);
      }
    }

    res.status(201).json({
      success: true,
      message: isImmediate ? "Notification sent" : "Notification scheduled",
      count: profileIds.length,
      notification: notif
    });

  } catch (err) {
    console.error("Notification Error:", err);
    next(err);
  }
};

exports.update = async (req, res, next) => {
  try {
    const { id } = req.params;
    const body = req.body;
    console.log(body)
    const notif = await Notification.findByIdAndUpdate(id, body, { new: true });
    if (!notif) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, notification: notif });
  } catch (err) {
    next(err);
  }
};

exports.cancel = async (req, res, next) => {
  try {
    const { id } = req.params;
    const notif = await Notification.findById(id);
    if (!notif) return res.status(404).json({ success: false, message: 'Not found' });
    notif.status = 'CANCELLED';
    await notif.save();
    res.json({ success: true, notification: notif });
  } catch (err) {
    next(err);
  }
};

exports.sendNow = async (req, res, next) => {
  try {
    const { id } = req.params;
    const notif = await Notification.findById(id);
    if (!notif) return res.status(404).json({ success: false, message: 'Not found' });
    if (notif.status === 'SENT') return res.status(400).json({ success: false, message: 'Already sent' });
    notif.status = 'SENT';
    notif.sentAt = new Date();
    await notif.save();
    await emitNotification(req.io, notif);
    res.json({ success: true, notification: notif });
  } catch (err) {
    next(err);
  }
};

exports.getPending = async (req, res, next) => {
  try {
    const pending = await Notification.find({ status: 'PENDING' }).sort({ publishAt: 1, createdAt: -1 }).exec();
    // console.log(pending)
    res.json({ success: true, pending });
  } catch (err) { next(err); }
};

exports.getHistory = async (req, res, next) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);
    const items = await Notification.find({ status: { $in: ['SENT', 'CANCELLED'] } }).sort({ sentAt: -1, createdAt: -1 }).skip(skip).limit(Number(limit));
    res.json({ success: true, items });
  } catch (err) { next(err); }
};

exports.getOne = async (req, res, next) => {
  try {
    const { id } = req.params;
    const notif = await Notification.findById(id);
    if (!notif) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, notification: notif });
  } catch (err) { next(err); }
};
