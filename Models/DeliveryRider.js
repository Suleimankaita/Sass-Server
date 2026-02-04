const mongoose=require("mongoose")
const DeliveryRiderSchema = new mongoose.Schema({
  name: String,
  phone: String,

  location: {
    type: { type: String, enum: ['Point'], default: 'Point' },
    coordinates: { type: [Number], index: '2dsphere' } // [lng, lat]
  },

  isOnline: { type: Boolean, default: false },
  isBusy: { type: Boolean, default: false },

  walletBalance: { type: Number, default: 0 }
});

module.exports=mongoose.model("DeliveryRider",DeliveryRiderSchema)