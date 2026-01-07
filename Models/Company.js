const mongoose = require("mongoose");

const CompanySchema = new mongoose.Schema(
  {
    CompanyName: String,
    // slug: { type: String, unique: true, index: true },
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

    expireAt: Date,
  },
  { timestamps: true }
);
  
module.exports = mongoose.model("Company", CompanySchema);
