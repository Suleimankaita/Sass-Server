const Order=require('../Models/User_order')
const asyncHandler=require("express-async-handler")
const User=require("../Models/User")
const Company=require("../Models/AdminOwner")

const Orders=asyncHandler(async(req,res)=>{
    try{
        const {Price,Username,ProductImg,ProductName,
            quantity,CompanyName}=req.body;
            if(!Price||!Username||!ProductImg||!ProductName||!
            quantity||!CompanyName)return res.status(400).json({'message':`To order this Product you Must fill all required Field`})
        const found=await User.findOne({Username}).exec();
        if(!found)return res.status(401).json({'message':`User not found ${Username}`})

        const Companyfound=await Company.findOne({CompanyName}).exec()

        if(!Companyfound)return res.status(400).json({'message':`Company Not found `})

        const OrderCreate=await Order.create({
            Price,
            Username,
            ProductImg,
            ProductName,
            quantity

        })

        if(!found.OrderId)found.OrderId=[];
        if(!Companyfound.OrderId)Companyfound.OrderId=[];

        Companyfound.OrderId.push(OrderCreate._id)
        await Companyfound.save();
        await found.save();

        res.status(201).json({"message":`You Successfully Order ${ProductName} the Product will Delivered soon `})

    }catch(err){
        res.status(500).json({"message":err.message})
    }
})

module.exports=Orders;