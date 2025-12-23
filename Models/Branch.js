const mongoose = require("mongoose");
const slugify = require("slugify"); // Install this: npm install slugify
const BranchSchema = new mongoose.Schema(
  {
    CompanyName: String,
    CompanyPassword: String,
    CompanyEmail:{ type: String, unique: true },
    
    Address: {
      StreetName: String,
      PostalNumber: Number,
      Lat: Number,
      Long: Number,
    },  
    slug: {
        type: String,
        unique: true,
        sparse: true // This allows multiple "null" values but keeps strings unique
    },
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

// Pre-save hook to automatically create a slug if it doesn't exist
BranchSchema.pre("save", function (next) {
    if (this.CompanyName && !this.slug) {
        this.slug = slugify(this.CompanyName, { lower: true, strict: true });
    }
    next();
});

module.exports = mongoose.model("Branch", BranchSchema);
