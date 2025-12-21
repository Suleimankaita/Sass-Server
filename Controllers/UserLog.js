const Logss=require("../Models/UserLog")

const asynchandler=require("express-async-handler");

const Logers=asynchandler(async(req,res)=>{
    try{
        const {name,Username,Password}=req.body;

        const ms=await Logss.create({
            Logs:{
                name,
                Username,
                Password,
                Date:new Date().toISOString(),
                time:new Date().toLocaleTimeString()
            }
        })

        res.status(201).json(ms)


    }catch(err){
        res.status(400).json({'message':err.message})
    }
})

module.exports=Logers