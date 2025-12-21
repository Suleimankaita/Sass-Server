const Jwt=require('jsonwebtoken');
const asynchandler=require("express-async-handler")
const User=require("../Models/User")
const Company=require("../Models/AdminOwner")

const Verify=asynchandler(async(req,res,next)=>{

    const auth=req.headers.authorization||req.headers['Authorization'];

    if(!auth.startsWith('Bearer '))return res.sendStatus(403)

        const token =auth.split(' ')[1]

        Jwt.verify(token,
            process.env.ACCESS_TOKEN_SECRET,
            async(err,decode)=>{
                try{

                    if(err)return res.sendStatus(403);
                    const id=decode.UserInfo.id
                    const found=await User.findById({id});
                    const CompanyFound=await Company.findById({id})
                
                    if(!found.Active)return res.status({'message':'Your Account is Suspendent Contact Ys_support@gmail.com'}) 
                    
                    if(!CompanyFound.Active)return res.status({'message':'Your Company has Suspendent Contact Ys_support@gmail.com'}) 

                        req.Username=decode?.UserInfo?.Username
                        req.Password=decode?.UserInfo?.Password
                        // req.Roles=decode?.UserInfo?.Roles
                       next() 
                    }catch(err){
                        res.status(501).json({'message':err.message})
                    }
                }
        )

})

module.exports=Verify;