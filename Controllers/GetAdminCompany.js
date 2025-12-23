const Admin=require('../Models/AdminOwner')
const asyncHandler=require('express-async-handler')

const GetCompany =asyncHandler(async(req,res)=>{
    
    const {token}=req.query;
       const id= req.userId
    if(!id)return res.status(400).json({'message':'UseriD is required'})

    const found=await Admin.findById(id).populate('UserProfileId').populate('companyId')

    if(!found)return res.status(401).json({'message':'User not found '})


    if(found.UserProfileId.token!==token)return res.status(403).json({'message':'Admin token Not verified'})


    // res.status(201).json(found.companyId)




        res.status(201).json(found)
    
    

})

module.exports=GetCompany