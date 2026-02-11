const mongoose = require("mongoose");

const CompanySchema = new mongoose.Schema(
  {
    CompanyName: String,
    slug: {
  type: Number,
  unique: true,
  index: true,
  default: () => Math.floor(100000 + Math.random() * 900000) // 6-digit
},
  
    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: "Admin" },
    CompanySettingsId: { type: mongoose.Schema.Types.ObjectId, ref: "CompanySettings" },
    TransactionId: [{ type: mongoose.Schema.Types.ObjectId, ref: "Transaction" }],
    CompanyUsers: [{ type: mongoose.Schema.Types.ObjectId, ref: "Company_User" }],
    EcomerceProducts: [{ type: mongoose.Schema.Types.ObjectId, ref: "EcomerceProducts" }],
    POSProductsId: [{ type: mongoose.Schema.Types.ObjectId, ref: "POSProducts" }],
    POSSell: [{ type: mongoose.Schema.Types.ObjectId, ref: "PosSell" }],
    CategoriesId: [{ type: mongoose.Schema.Types.ObjectId, ref: "CateGories" }],
    Orders: [{ type: mongoose.Schema.Types.ObjectId, ref: "Order" }],
    SaleId: [{ type: mongoose.Schema.Types.ObjectId, ref: "Sale" }],
    WalletNumber: Number,
    walletBalance: { type: [Number], default: 0 },

      BranchId: [{
          type: mongoose.Schema.Types.ObjectId,
          ref: "Branch",
          index: true,
        }],
        DealsId: { type: mongoose.Schema.Types.ObjectId, ref: "DealProduct" },
    subscriptionPlan: {
      type: String,
      enum: ["Free", "Basic", "Pro", "Enterprise"],
      default: "Free",
    },

    // Trial & Subscription Management
    trialStartDate: {
      type: Date,
      default: () => new Date(),
    },
    trialEndDate: {
      type: Date,
      default: () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
    },
    isSubscribed: {
      type: Boolean,
      default: false,
    },
    subscriptionEndDate: Date,
    subscriptionStatus: {
      type: String,
      enum: ["trial", "active", "expired", "cancelled"],
      default: "trial",
    },

    // Subscription Limits - Branch Management
    maxBranches: {
      type: Number,
      default: 1, // Free and Basic: 1 branch, Pro/Enterprise: Unlimited
    },
    branchesCreated: {
      type: Number,
      default: 0,
    },

    // Subscription Limits - User Management
    maxUsers: {
      type: Number,
      default: 5, // Free and Basic: 5 users, Pro/Enterprise: Unlimited
    },
    usersCreated: {
      type: Number,
      default: 0,
    },

    expireAt: Date,
  },
  { timestamps: true }
);
  
module.exports = mongoose.model("Company", CompanySchema);
