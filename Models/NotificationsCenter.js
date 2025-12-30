// Models/Notification.js
const mongoose = require("mongoose");

const NotificationSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    message: { type: String, required: true },

    category: {
      type: String,
      enum: [
        "General Announcement",
        "Critical Maintenance",
        "New Feature",
        "Security Alert"
      ],
      default: "General Announcement"
    },

    targets: [{ type: String }], // POS Users, Admins, etc.

    channels: {
      email: { type: Boolean, default: true },
      inApp: { type: Boolean, default: true }
    },

    publishAt: { type: Date }, // null = send immediately

    status: {
      type: String,
      enum: ["PENDING", "SENT", "CANCELLED"],
      default: "PENDING"
    },

    sentAt: { type: Date }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Notification", NotificationSchema);
