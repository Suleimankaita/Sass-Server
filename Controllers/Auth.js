const Jwt=require('jsonwebtoken');
const asynchandler=require('express-async-handler');
const User = require('../Models/User');
const Logs=require('../Models/UserLog')
const Auth=asynchandler(async(req,res)=>{

    try{

        const {Username,Password}=req.body;

        if(!Username||!Password)return res.status(400).json({'message':'All field are required'})
           
          const found=await User.findOne({Username}).exec()
          
          if(!found)return res.status(400).json({'message':`User not Found`})

            if(!found.Active)return res.status(501).json({'message':`this account is Already Suspendent Contact Support Ys Store Support@gmail.com `})

             if(found.Username!==Username||found.Password!==Password)return res.status(400).json({'message':`Incorrect Username Or Password`}) 
                
                if(found.Username===Username&&found.Password===Password){
                 const Logs_id=await Logs.create({
                    Username:found.Username,
                    name:found.Firstname,
                    Date:new Date().toISOString().split("T")[0],
                    time:new Date().toLocaleTimeString()
                 })
                if (!found.UserLogId) found.UserLogId = [];
                    found.UserLogId.push(Logs_id._id);

                    if(!found.Role)found.Role="User"
                    
                 await found.save()
                    const accesstoken=Jwt.sign(
                        {
                            "UserInfo":{
                                "Username":found.Username,
                                "Password":found.Password,
                                "Role":found.Role,
                                "id":found._id
                            }
                    },process.env.ACCESS_TOKEN_SECRET,
                    {expiresIn:"5m"}
                )

                
                    const refreshToken=Jwt.sign(
                        {
                            "UserInfo":{
                                "Username":found.Username,
                                "Password":found.Password,
                                "Role":found.Role,
                                "id":found._id
                            }
                    },process.env.REFRESH_TOKEN_SECRET,
                    {expiresIn:"7d"}
                )
                
              
                res.cookie('jwt', refreshToken, {
                sameSite: "none",
                secure: false,
                httpOnly: true,
                maxAge: 7 * 24 * 60 * 60 * 1000
                });

                res.status(201).json({accesstoken})
            }
    }catch(err){
        res.status(401).json({'message':err.message})
    }

})

module.exports=Auth;