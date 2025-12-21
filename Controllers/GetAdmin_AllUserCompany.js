
const User=require('../Models/CompanyUsers')
const Admins=require('../Models/AdminOwner')
const asyncHandler=require('express-async-handler')

const GetCompanyUsers=asyncHandler(async(req,res)=>{
    
    try{
        const {CompanyName,id}=req.body;
        const foundUser=await User.findById({_id:id})
        if(!foundUser)return res.status(401).json({'message':'User not found'})
        const allUsers=await Admins.find(). populate("Company_UserId").exec()
        
        if(!allUsers)return res.status(400).json({'message':'No Users To display'})
            res.status(201).json(allUsers.flatMap(res=>res.Company_UserId))
    }catch(err){
        res.status(400).json({'message':err.message})
    }
})

module.exports=GetCompanyUsers;