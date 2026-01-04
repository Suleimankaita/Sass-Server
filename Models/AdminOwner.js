const mongoose = require("mongoose");

const AdminSchema = new mongoose.Schema(
  {
    // Firstname: String,
    // Lastname: String,
    Username: { type: String, unique: true, index: true },
    Password: String,

    // Company details  
    // CompanyName: String,
    // CompanyLogo: String,
    // CAC_img: String,
    // CAC_Number: Number,

    // Address: {
    //   StreetName: String,
    //   PostalNumber: Number,
    //   Lat: Number,
    //   Long: Number,
    // },

    UserProfileId:{
     type:mongoose.Schema.Types.ObjectId,
     ref:"UserProfile",
      index: true,

    },

    // Wallet & finance
    // WalletNumber: { type: Number, index: true },
    // WalletBalance: { type: Number, default: 0 },

    Active: { type: Boolean, default: true },
    Verified: { type: Boolean, default: false },

    // Important tenant ID for SaaS apps
    companyId:{
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      index: true,
      unique:true
    },
    // BranchId: [{
    //   type: mongoose.Schema.Types.ObjectId,
    //   ref: "Branch",
    //   index: true,
    // }],

    // Relationships
     Role:{
      type:String,
      default:"Admin"
    },  
    UserLogId: [{ type: mongoose.Schema.Types.ObjectId, ref: "UserLog" }],
    // EcomerceProducts: [{ type: mongoose.Schema.Types.ObjectId, ref: "EcomerceProducts" }],
    // POSProductsId: [{ type: mongoose.Schema.Types.ObjectId, ref: "POSProducts" }],
    // Orders: [{ type: mongoose.Schema.Types.ObjectId, ref: "Order" }],

  },
  { timestamps: true }
);

module.exports = mongoose.model("Admin", AdminSchema);
