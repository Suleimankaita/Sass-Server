
const Admin=require("../Models/AdminOwner")
const asyncHandler=require('express-async-handler');

const CompanyVerify=asyncHandler(async(req,res)=>{
    try{

        const {verify,id}=req.body;

        const found=await Admin.findOne({_id:id}).exec()

        if(!found)return res.status(401).json({'message':`Company Not found `})
                found.Verified=verify
        await found.save()
        console.log(found)
        res.status(201).json(found)

    }catch(err){
        res.status(400).json({'message':err.message})
    }
})

module.exports=CompanyVerify;