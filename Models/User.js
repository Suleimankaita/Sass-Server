const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema(
  {
    Firstname: String,
    Lastname: String,
    Username: { type: String, unique: true }, 
    // Add these to your Schema
      resetOTP: { type: String },
      resetOTPExpires: { type: Date },
      IsOtpverified: { type: Boolean,default:false },
    WalletNumber: Number,
    WalletBalance: { type: Number, default: 0 },
    UserLogId: [{ type: mongoose.Schema.Types.ObjectId, ref: "UserLog" }],
    OrderId: [{ type: mongoose.Schema.Types.ObjectId, ref: "Order" }],
    UserProfileId: { type: mongoose.Schema.Types.ObjectId, ref: "UserProfile" },
    Role:{
      type:String,
      default:"User"
    },  
    Active: { type: Boolean, default: true },
  },
  { timestamps: true }
);
  
module.exports = mongoose.model("YS_store_Users", UserSchema);
