const cron = require('node-cron');
const Notification = require('../Models/NotificationsCenter'); // Adjust path
const UserProfile = require('../Models/Userprofile');   // Adjust path
const User = require('../Models/User');                 // Adjust path
const Admin = require('../Models/AdminOwner');               // Adjust path
const CompanyUsers = require('../Models/CompanyUsers'); // Adjust path

// --- HELPER: Find IDs based on targets ---
const getTargetProfileIds = async (targets) => {
  let queryResults = [];

  // If no targets, fetch everyone
  if (!targets || targets.length === 0) {
    const [u, a, c] = await Promise.all([
      User.find().select("UserProfileId").lean(),
      Admin.find().select("UserProfileId").lean(),
      CompanyUsers.find().select("UserProfileId").lean()
    ]);
    queryResults = [...u, ...a, ...c];
  } else {
    // Specific groups
    if (targets.includes("Ecommerce Users")) {
      const users = await User.find({ userType: "User" }).select("UserProfileId").lean();
      queryResults.push(...users);
    }
    if (targets.includes("POS Admins")) {
      const admins = await Admin.find({ Role: "Admin" }).select("UserProfileId").lean();
      queryResults.push(...admins);
    }
    if (targets.includes("POS Users")) {
      const cus = await CompanyUsers.find().select("UserProfileId").lean();
      queryResults.push(...cus);
    }
  }

  // Remove nulls and duplicates
  return [...new Set(queryResults.map(i => i.UserProfileId?.toString()).filter(id => id))];
};

// --- MAIN FUNCTION ---
const notificationScheduler = () => {
  console.log("🕒 Notification Scheduler Started...");

  // Run every minute
  cron.schedule('* * * * *', async () => {
    try {
      const now = new Date();

      // 1. Find pending notifications that are due
      const dueNotifications = await Notification.find({
        status: "PENDING",
        publishAt: { $lte: now }
      });

      if (dueNotifications.length === 0) return;

      console.log(`[Scheduler] Processing ${dueNotifications.length} notifications...`);

      for (const notif of dueNotifications) {
        // 2. Get Targets
        const profileIds = await getTargetProfileIds(notif.targets);

        // 3. Update User Profiles
        if (profileIds.length > 0) {
          await UserProfile.updateMany(
            { _id: { $in: profileIds } },
            { $addToSet: { NotificationId: notif._id } }
          );
        }

        // 4. Mark as SENT
        notif.status = "SENT";
        notif.sentAt = now;
        await notif.save();

        console.log(`✅ Auto-Sent: "${notif.title}" to ${profileIds.length} users.`);
      }
    } catch (err) {
      console.error("❌ Scheduler Error:", err);
    }
  });
};

module.exports = notificationScheduler;