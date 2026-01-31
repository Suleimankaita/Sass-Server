const mongoose = require("mongoose");

const AddressSchema = new mongoose.Schema({
  label: { type: String, required: true },                 // e.g., Home, Office
  street: { type: String, required: true },
  city: { type: String, required: true },
  stateZip: { type: String, required: true },
  type: { type: String, enum: ["Shipping", "Billing"], required: true },
  isDefault: { type: Boolean, default: false },
});

const PaymentMethodSchema = new mongoose.Schema({
  type: { type: String, required: true },                 // e.g., Visa, MasterCard
  last4: { type: String, required: true },                // last 4 digits
  expiry: { type: String, required: true },
  isDefault: { type: Boolean, default: false },
  addedDate: { type: Date, default: Date.now },
});

const UserProfileSchema = new mongoose.Schema(
  {
    // Identity / Account Info
    fullName: { type: String, trim: true },
    companyName: { type: String, trim: true },
    Email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    phone: { type: String, trim: true },
    password: { type: String,  },
    token: { type: String, default: null },
    profileImage: { type: String, default: null },

    // Addresses
    addresses: [AddressSchema],

    // Payment Methods
    paymentMethods: [PaymentMethodSchema],

    // Orders & Tickets
    orders: [{ type: mongoose.Schema.Types.ObjectId, ref: "Order" }],
    tickets: [{ type: mongoose.Schema.Types.ObjectId, ref: "Ticket" }],
        SaleId: [{ type: mongoose.Schema.Types.ObjectId, ref: "Sale" }],

    // Products & Cart
    ecommerceProducts: [{ type: mongoose.Schema.Types.ObjectId, ref: "Products" }],
    NotificationId: [{ type: mongoose.Schema.Types.ObjectId, ref: "Notification" }],
    posProducts: [{ type: mongoose.Schema.Types.ObjectId, ref: "POSProducts" }],
    cart: { type: mongoose.Schema.Types.ObjectId, ref: "Cart", default: null },
    CartId: { type: mongoose.Schema.Types.ObjectId, ref: "Cart", default: null },

    // Wallet / Balance
    walletNumber: { type: Number, default: null },
    walletBalance: { type: [Number], default: 0 },
    companySuspense: { type: Boolean, default: false },

    // User Activity / System
    userActivities: [{ type: mongoose.Schema.Types.ObjectId, ref: "UserActivity" }],
  },
  { timestamps: true } // adds createdAt and updatedAt
);

// Create a unique index only for documents where Email is present and not null.
// This avoids duplicate-key errors caused by multiple documents with Email: null.
UserProfileSchema.index(
  { Email: 1 },
  { unique: true, partialFilterExpression: { Email: { $exists: true, $ne: null } } }
);

module.exports = mongoose.model("UserProfile", UserProfileSchema);
