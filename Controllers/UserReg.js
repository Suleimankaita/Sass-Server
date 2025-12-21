const asynchandler=require('express-async-handler');
// const bcrypt=require("bc")   
const Users=require("../Models/User")
const Company=require("../Models/AdminOwner")

const UserReg=asynchandler(async(req,res)=>{

    try{

        const {Username,Password,Firstname,Lastname,StreetName, PostalNumber,Lat,Long,Email}=req.body;

        if(!Username&&!Password&&!Firstname&&!Lastname&&!Email)return res.status(400).json({'message':'All Field are required '})

            const found=await Users.findOne({Username}).collation({strength:2,locale:'en'}).exec();
            // const CompanyFound=await Company.findOne({Username}).collation({strength:2,locale:'en'}).exec();
            
            if(found)return res.status(409).json({'message':`this Username ${Username} is Already exist`});
            
            // if(CompanyFound)return res.status(409).json({'message':`this Username ${Username} is Already Taken On another Company`});
            
            // if(found.Email)return res.status(409).json({'message':`this Email ${Email} is Already Taken by another User`})
                
                await Users.create({
                    Username,
                    Password,
                    Firstname,
                    Lastname,
                    Email,
                    WalletNumber:10023,
                    Address:{
                    StreetName, 
                    PostalNumber,
                    Lat,
                    Long,
                }
                })
                res.status(201).json({'message':`new User is Created ${Username}`})
    }catch(err){
        res.status(401).json({'message':err.message})
    }
})

module.exports=UserReg;