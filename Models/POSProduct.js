const mongoose = require("mongoose");

const ProductSchema = new mongoose.Schema(
  {
 companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      index: true,
    },
    name: { type: String, required: true },
    description: String,
 UserUpload:{
      name:String,
      Username:String,
      Date:{
        type:String,
        default:()=>new Date().toISOString().split('T')[0]
      },
      ChangeLog:{
          type:String,
          default:"POS"
        },
      Time:{
        type:String,
        default:()=>new Date().toLocaleTimeString()
      },
    },
    price: Number,
   
    costPrice: Number,

    sku: { type: String, index: true },
    barcode: { type: String, index: true },
    categoryName: String,
    quantity: { type: Number, default: 0 },
    reorderLevel: { type: Number, default: 5 },

    img: [String],

    user_add: String,

    // For daily logs
    date: { type: String, default: () => new Date().toISOString().split("T")[0] },
    time: { type: String, default: () => new Date().toLocaleTimeString() },
  },
  { timestamps: true }
);

module.exports = mongoose.model("POSProducts", ProductSchema);
