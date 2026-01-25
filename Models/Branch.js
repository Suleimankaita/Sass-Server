const mongoose = require("mongoose");
const slugify = require("slugify");
const crypto = require("crypto"); // Built-in Node.js module

const BranchSchema = new mongoose.Schema(
  {
    CompanyName: { type: String, required: true },
    CompanyPassword: { type: String },
    CompanyEmail: { type: String, unique: true, required: true },
    CategoriesId: [{ type: mongoose.Schema.Types.ObjectId, ref: "CateGories" }],
    
    Address: {
      StreetName: String,
      PostalNumber: Number,
      Lat: Number,
      Long: Number,
    },  
    slug: {
        type: String,
        unique: true,
        index: true,
        sparse: true 
        
    },
    WalletNumber: Number,
    walletBalance: { type: [Number], default: 0 },

        SaleId: [{ type: mongoose.Schema.Types.ObjectId, ref: "Sale" }],
        TransactionId: [{ type: mongoose.Schema.Types.ObjectId, ref: "Transaction" }],
    CompanySettingsId: { type: mongoose.Schema.Types.ObjectId, ref: "CompanySettings" },
    DealsId: { type: mongoose.Schema.Types.ObjectId, ref: "DealProduct" },
    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: "Admin" },
    CompanyUsers: [{ type: mongoose.Schema.Types.ObjectId, ref: "Company_User" }],
    EcomerceProducts: [{ type: mongoose.Schema.Types.ObjectId, ref: "EcomerceProducts" }],
    POSProductsId: [{ type: mongoose.Schema.Types.ObjectId, ref: "POSProducts" }],
    Orders: [{ type: mongoose.Schema.Types.ObjectId, ref: "Order" }],
    
    subscriptionPlan: {
      type: String,
      enum: ["Free", "Basic", "Pro", "Enterprise"],
      default: "Free",
    },
    Date:{
      type:String,
      default:()=>new Date(),
    },

    expireAt: Date,
  },
  { timestamps: true }
);

// Improved Pre-save hook
BranchSchema.pre("save", async function (next) {
    // Only generate slug if CompanyName is modified OR slug doesn't exist
    if (this.isModified("CompanyName") || !this.slug) {
        let baseSlug = slugify(this.CompanyName, { lower: true, strict: true });

        // Check if this slug already exists in the database
        const slugExists = await mongoose.model("Branch").findOne({ slug: baseSlug });

        if (slugExists && slugExists._id.toString() !== this._id.toString()) {
            // If it exists, append a random 4-character hex string to ensure uniqueness
            const randomSuffix = crypto.randomBytes(2).toString("hex"); 
            this.slug = `${baseSlug}-${randomSuffix}`;
        } else {
            this.slug = baseSlug;
        }
    }
    next();
});

module.exports = mongoose.model("Branch", BranchSchema);