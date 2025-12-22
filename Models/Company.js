const mongoose = require("mongoose");

const CompanySchema = new mongoose.Schema(
  {
    Companyname: String,
    slug: { type: String, unique: true, index: true },
    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: "Admin" },
    CompanyUsers: [{ type: mongoose.Schema.Types.ObjectId, ref: "Company_User" }],
    EcomerceProducts: [{ type: mongoose.Schema.Types.ObjectId, ref: "Products" }],
    POSProductsId: [{ type: mongoose.Schema.Types.ObjectId, ref: "POSProducts" }],
    Orders: [{ type: mongoose.Schema.Types.ObjectId, ref: "Order" }],
    
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
