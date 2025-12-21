const mongoose = require("mongoose");

const CompanySchema = new mongoose.Schema(
  {
    name: String,
    slug: { type: String, unique: true, index: true },
    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: "Admin" },

    subscriptionPlan: {
      type: String,
      enum: ["Free", "Basic", "Pro", "Enterprise"],
      default: "Free",
    },

    expireAt: Date,
  },
  { timestamps: true }
);
  
module.exports = mongoose.model("Company", CompanySchema);
