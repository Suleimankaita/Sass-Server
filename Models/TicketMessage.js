const mongoose = require("mongoose");

const TicketMessageSchema = new mongoose.Schema({
  ticket: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Ticket",
    required: true,
    index: true
  },

  type: {
    type: String,
    enum: ["customer", "agent", "note"],
    required: true
  },

  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },

  senderName: {
    type: String,              // cached for fast UI rendering
    required: true
  },

  message: {
    type: String,
    required: true
  },

  isInternal: {
    type: Boolean,
    default: false             // true for internal notes
  }
}, { timestamps: true });

module.exports = mongoose.model("TicketMessage", TicketMessageSchema);
