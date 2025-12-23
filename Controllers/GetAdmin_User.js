
const User=require('../Models/CompanyUsers')
const asyncHandler=require('express-async-handler')

const GetCompanyUsers=asyncHandler(async(req,res)=>{
    
    try{
        const {CompanyName,id}=req.body;
        const foundUser=await User.findById({_id:id})
        if(!foundUser)return res.status(400).json({'message':'No Users To display'})
            res.status(201).json(foundUser)
    }catch(err){
        res.status(400).json({'message':err.message})
    }
})

module.exports=GetCompanyUsers;