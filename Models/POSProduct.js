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
   soldAtPrice: { type: Number, required: true },
    actualPrice: { type: Number, required: true },  

    costPrice: Number,

    sku: { 
    type: String, 
    index: true, 
    unique: true, // Recommended to prevent duplicate SKUs
    default: () => {
      // Generates a random SKU like: SKU-7A9B2C
      return "SKU-" + Math.random().toString(36).substring(2, 8).toUpperCase();
    } 
  },
    barcode: { type: String, index: true ,default:()=>Math.floor(100000000000 + Math.random() * 900000000000).toString()},
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
