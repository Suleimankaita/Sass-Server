const wishlist=require('../Models/wismhlist');
const asynchanler=require('express-async-handler');
const ecomerceProduct=require('../Models/EcomerceProducts');

const GetWishilist=asynchanler(async(req,res)=>{
    const id=req.userId;
    console.log(id)
    if(!id)return res.status(403).json({'message':'Userid is required'});

    const found=await wishlist.find({userId:id}).populate('productId').exec()


     res.status(201).json(found)



});

const createWishilist=asynchanler(async(req,res)=>{
    const {productId,wishlistId}=req.body;
    const id=req.userId;
    if(!id)return res.status(403).json({'message':'Userid is required'});

    const ecomfound=await ecomerceProduct.findById(productId?.toString());
    
    if(!ecomfound)return res.status(400).json({'message':`${ecomfound?.name}`})

    const found =await wishlist.findById(wishlistId?.toString());

    if(found)return res.status(400).json({'message':`${name} is already in the wishlist`})

    const created=await wishlist.create({
        name:ecomfound?.name,
        img:Array.isArray(ecomfound?.img)?ecomfound?.img[0]:null,
        actualPrice:ecomfound?.actualPrice,
        SoldPrice:ecomfound?.soldAtPrice,
        rates:ecomfound?.rates||0,
        userId:id,
        productId
    })
    res.status(201).json(created)
}) 

const remove=asynchanler(async(req,res)=>{
    const id=req.userId;
    const {wishlistId}=req.params;
    if(!id)return res.status(403).json({'message':'Userid is required'});
    if(!wishlistId)return res.status(403).json({'message':'WishlistId is required'});

    const removed=await wishlist.findByIdAndDelete(wishlistId);
     res.status(200).json(removed);

})

module.exports={GetWishilist,createWishilist,remove};
