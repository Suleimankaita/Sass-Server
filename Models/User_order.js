const mongoose = require("mongoose");

const OrderSchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      index: true,
    },

    Username: String, // who ordered

    Customer: {
      name: String,
      phone: String,
      email: String,
    },

    items: [
      {
        productId: { type: mongoose.Schema.Types.ObjectId, ref: "Products" },
        ProductName: String,
        ProductImg: [String],
        Price: Number,
        quantity: Number,
      },
    ],

    subtotal: Number,
    total: Number,

    orderDate: { type: String, default: () => new Date().toISOString().split("T")[0] },
    time: { type: String, default: () => new Date().toLocaleTimeString() },

    status: {
      type: String,
      enum: ["Pending", "Processing", "Completed", "Cancelled"],
      default: "Pending",
    },

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
      tracking: [{ lat: Number, lng: Number, at: Date }],
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Order", OrderSchema);
