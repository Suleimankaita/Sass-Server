const mongoose=require('mongoose');

const Billing = new mongoose.Schema({
  companyId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Company', 
    required: true 
  },
  invoiceId: { 
    type: String, 
    unique: true,
    default: () => `YS-INV-${Math.floor(100000 + Math.random() * 900000)}` 
  },
  planName: { type: String, required: true },
  amount: { type: Number, required: true }, // Store in Naira
  reference: { type: String, required: true }, // Paystack Ref
  status: { 
    type: String, 
    // enum: ['Success', 'Failed', 'Pending'], 
    default: 'Pending' 
  },
  paymentGateway: { type: String, default: 'Paystack' },
  paidAt: { type: Date, default: Date.now }
}, { timestamps: true });

module.exports=mongoose.model('Billing',Billing)