const mongoose = require("mongoose");

const CompanyUserSchema = new mongoose.Schema(
  {
    Firstname: String,
    Lastname: String,

    Username: { type: String, unique: true },
    Password: String,
    Email: { type: String, unique: true },

    CompanyName: String,
  
    UserProfileId:{
     type:mongoose.Schema.Types.ObjectId,
     ref:"UserProfile",
      index: true,

    },

    // For multi-tenant
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      index: true
    },

    Address: {
      StreetName: String,
      PostalNumber: Number,
      Lat: Number,
      Long: Number,
    },

    // Roles: admin, cashier, inventory, rider, sales, etc.
    Role: {
      type: String,
      enum: ["admin", "cashier", "inventory", "rider", "staff"],
      default: "staff",
    },

    LogId: [{ type: mongoose.Schema.Types.ObjectId, ref: "UserLog" }],

    Active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Company_User", CompanyUserSchema);
