const mongoose = require("mongoose");

const OrderSchema = new mongoose.Schema(
  {
    orderId: { type: String, unique: true }, // Needed for your React table
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: "Company", index: true },
    branchId: { type: mongoose.Schema.Types.ObjectId, ref: "Branch", index: true },

    Username: String, 

    Customer: { 
      name: String,
      phone: String,
      email: String,
      address: String, // Added this for your table display
    },

    items: [
      {
        productId: { type: mongoose.Schema.Types.ObjectId, ref: "EcomerceProducts" },
        ProductName: String,
        ProductImg: [String],
        soldAtPrice: Number,
        quantity: Number,
        sku: String,      // Added for OrderDetailsPage
        variant: String,  // Added for OrderDetailsPage
      },
    ],

    subtotal: Number,
    shippingCost: { type: Number, default: 0 },
    tax: { type: Number, default: 0 },
    total: Number,

    orderDate: { type: String, default: () => new Date().toISOString().split("T")[0] },
    time: { type: String, default: () => new Date().toLocaleTimeString() },

    status: {
      type: String,
      // Updated to match your React statusColors icons
      enum: ["Pending", "Processing", "Shipped", "Delivered", "Cancelled", "Completed"],
      default: "Pending",
    },
    paymentReference: {
      type: String,
      unique: true,
      index: true,
    },
    paymentStatus: String,
    paid: Boolean,
    paymentGateway: String,
    amountPaid: Number,
    paymentStatus: {
      type: String,
      enum: ["Unpaid", "Paid", "Partially Paid", "Refunded"],
      default: "Unpaid",
    },

    delivery: {
      riderId: { type: mongoose.Schema.Types.ObjectId, ref: "Company_User" },
      location: {
        lat: Number,
        lng: Number,
      },
      // For the animated Polyline in your map
      tracking: {
        type: [{ lat: Number, lng: Number, at: { type: Date, default: Date.now } }],
        default: [{
          lat: 0,
          lng: 0,
          // at: new Date(),
        }],
    },
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Order", OrderSchema);