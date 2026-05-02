const mongosee=require('mongoose');

const WishListSchema=new mongosee.Schema({
    name:String,
    img:String,
    actualPrice:Number,
    SoldPrice:Number,
    rates:Number,
    productId:{
        type:mongosee.Types.ObjectId,
        ref:'EcomerceProducts',
    },
    userId:{
        type:mongosee.Schema.Types.ObjectId,
        ref:'UserProfile'
},

},{
    timestamps:true

})

module.exports=mongosee.model('wishlist',WishListSchema)