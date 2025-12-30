const mongoose = require("mongoose");

const TicketSchema = new mongoose.Schema({
  ticketId: {
    type: String,              // EC2023-00123
    required: true,
    unique: true,
    index: true
  },

  subject: {
    type: String,
    required: true
  },

  customer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },

  assignedAgent: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User"
  },

  status: {
    type: String,
    enum: ["NEW", "OPEN", "CLOSED"],
    default: "NEW"
  },

  statusColor: {
    type: String,              // bg-red-500, bg-yellow-500
    required: true
  },

  lastMessageAt: {
    type: Date,
    default: Date.now
  },

  closedAt: {
    type: Date
  }
}, { timestamps: true });

module.exports = mongoose.model("Ticket", TicketSchema);
