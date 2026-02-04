const mongoose=require("mongoose")

const RiderTransactionSchema = new mongoose.Schema({
  rider: { type: mongoose.Schema.Types.ObjectId, ref: 'DeliveryRider' },
  order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order' },
  amount: Number,
  type: { type: String, enum: ['delivery_income'] },
  status: { type: String, enum: ['completed'] }
}, { timestamps: true });


module.exports=mongoose.model("RiderTransaction",RiderTransactionSchema)