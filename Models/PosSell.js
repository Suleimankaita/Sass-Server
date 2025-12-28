const mongosse=require('mongoose');
const PosSellSchema=new mongosse.Schema(
    {
        ProductName:String,
        productPice:Number,
        quantity:Number,
        ActualPrice:Number,
        totalPrice:Number,
        username:String,
        companyType:String,
        Date:{
            type:String,
            default:()=>new Date().toISOString().split('T')[0]
        },
        time:{
            type:String,
            default:()=>new Date().toLocaleTimeString()
        }

    },
    {
        timestamps:true
    }
)

module.exports=mongosse.model("PosSell",PosSellSchema);