const mongoose=require("mongoose");

const ProductsViewSchema = new mongoose.Schema({
    Username: {
        type:String,
        required:true
    },
    ProductName: {
        type:String,
        required:true
    },
    type:String,
    
    CategoryName: String,
    Date: {
        type: String,
        default: new Date().toISOString().split('T')[0] // Store only the date part in ISO format
    },
    Time: {
        type: String,
        default: new Date().toLocaleTimeString() // Store only the time part in ISO format
    },

    
},{
    timestamps:true
})

module.exports=mongoose.model("ProductView",ProductsViewSchema)