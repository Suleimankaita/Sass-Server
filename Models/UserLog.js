const mongoose = require("mongoose");

const UserLogSchema = new mongoose.Schema(
  {
    Username: String,
    action: { type: String, default: "Login" }, // Login, Create Order, Update Product
    ip: String,
    device: String,

    Date: String,
    time: String,
  },
  { timestamps: true }
);

module.exports = mongoose.model("UserLog", UserLogSchema);
