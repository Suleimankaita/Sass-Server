const mongoose = require("mongoose");

const UserProfileSchema = new mongoose.Schema(
  {
    CompanyName: String,
    EcomerceProducts: [{ type: mongoose.Schema.Types.ObjectId,
      ref: "Products" }],
    POSProductsId: [{ type: mongoose.Schema.Types.ObjectId, ref: "POSProducts" }],
    UserActivitiesId: [{ type: mongoose.Schema.Types.ObjectId, ref: "UserActivity" }],
    TicketId: [{ type: mongoose.Schema.Types.ObjectId, ref: "Ticket" }],
      Orders: [{ type: mongoose.Schema.Types.ObjectId, ref: "Order" }],
    Password: String,
Email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
    token:String,
    Phone: String,
    Address: {
      StreetName: String,
      PostalNumber: Number,
      Lat: Number,
      Long: Number,
    },  
    CartId:{ type: mongoose.Schema.Types.ObjectId, ref: "Cart" },
    token:String,
    WalletNumber: Number,
    WalletBalance: { type: Number, default: 0 },
    CompanySuspense: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("UserProfile", UserProfileSchema);
