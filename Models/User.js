const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema(
  {
    Firstname: String,
    Lastname: String,
    Username: { type: String, unique: true },
    Password: String,
    Email: { type: String, unique: true },

    Phone: String,

    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      index: true,
    },

    Address: {
      StreetName: String,
      PostalNumber: Number,
      Lat: Number,
      Long: Number,
    },

    WalletNumber: Number,
    WalletBalance: { type: Number, default: 0 },

    UserLogId: [{ type: mongoose.Schema.Types.ObjectId, ref: "UserLog" }],
    OrderId: [{ type: mongoose.Schema.Types.ObjectId, ref: "Order" }],
    Role:{
      type:String,
      default:"User"
    },
    Active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("YS_store_Users", UserSchema);
