const mongoose = require('mongoose');

const ProductSchema = new mongoose.Schema({
    name: { type: String, required: true },
    // sku: { type: String, unique: true },
    soldAtPrice: { type: Number, required: true },
    Date:{
        type:String,
        default:()=>new Date().toISOString()
    },
    productType:String,
    Categorie:String,
    quantity:Number,
    Time:{
        type:String,
        default:()=>new Date().toLocaleTimeString()
    },
    img:String,
    actualPrice: { type: Number, required: true }  
  
});

module.exports= mongoose.model('Sale', ProductSchema);