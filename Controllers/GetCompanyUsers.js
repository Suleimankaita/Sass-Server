const Admin =require("../Models/AdminOwner");
const asyncHandler=require("express-async-handler");

const GetCompanyUsers=asyncHandler(async(req,res)=>{
    
    const id=req.userId
    
    if(!id)return res.status(400).json({'message':`Userid not found`})

    const found=await Admin.findById(id).populate('CompanyUsers')
})

module.exports=GetCompanyUsers