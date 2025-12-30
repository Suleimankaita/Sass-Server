const mongoose=require('mongoose')

const TicketSchema = new mongoose.Schema({
  ticketId: {
    type: String,            // "EC2023-00123"
    required: true,
    unique: true,
    index: true
  },

  subject: {
    type: String,            // "Missing Item in Order"
    required: true
  },

  assignedAgent: {
    name: {
      type: String,          // "Jane Doe"
      required: true
    },
    agentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    }
  },

  status: {
    type: String,
    enum: ["NEW", "OPEN", "CLOSED"],
    default: "NEW"
  },

  statusColor: {
    type: String,            // "bg-red-500", "bg-yellow-500"
    required: true
  },

  lastActivityAt: {
    type: Date               // used to compute "1 hour ago"
  },

  createdAt: {
    type: Date,
    default: Date.now
  },

  closedAt: {
    type: Date
  }
},
{
    timestamps:true
});

module.exports=mongoose.model('Ticket',TicketSchema)