const mongoose = require("mongoose");

const UserProfileSchema = new mongoose.Schema(
  {
    CompanyName: String,
    EcomerceProducts: [{ type: mongoose.Schema.Types.ObjectId,
      ref: "Products" }],
    POSProductsId: [{ type: mongoose.Schema.Types.ObjectId, ref: "POSProducts" }],
      Orders: [{ type: mongoose.Schema.Types.ObjectId, ref: "Order" }],
    Password: String,
    Email: { type: String, unique: true },
    Phone: String,
    Address: {
      StreetName: String,
      PostalNumber: Number,
      Lat: Number,
      Long: Number,
    },

    WalletNumber: Number,
    WalletBalance: { type: Number, default: 0 },
    CompanySuspense: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("UserProfile", UserProfileSchema);
