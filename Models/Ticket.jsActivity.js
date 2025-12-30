const mongoose = require("mongoose");

const TicketActivitySchema = new mongoose.Schema({
  ticket: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Ticket",
    required: true
  },

  action: {
    type: String,              // CREATED, REPLIED, CLOSED, REOPENED
    required: true
  },

  performedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User"
  },

  meta: {
    type: Object
  }
}, { timestamps: true });

module.exports = mongoose.model("TicketActivity", TicketActivitySchema);
