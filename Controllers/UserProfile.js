const asyncHandler=require('express-async-handler');
const profile=require('../Models/Userprofile');
const User=require('../Models/User');
const CompanyUser=require('../Models/CompanyUsers');
const Admin=require('../Models/AdminOwner');

const GetProfile=asyncHandler(async(req,res)=>{
    
    const id=req.userId;

    if(!id)return res.status(400).json({"message":"UserId required"});

    const UserFound=await User.findById(id).populate('UserProfileId').populate('OrderId')||await CompanyUser.findById(id).populate('UserProfileId').populate('OrderId')||Admin.findById(id).populate('UserProfileId').populate('OrderId')

    if(!UserFound)return res.status(401).json({"message":"User Not Found"});

    res.status(201).json(UserFound)
})

module.exports=GetProfile