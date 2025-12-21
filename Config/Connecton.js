const mongoose =require("mongoose")
const asynchandler=require("express-async-handler");

const connection =asynchandler(async(req,res)=>{
    try{
        await mongoose.connect(process.env.URI)
    }catch(err){
        console.log(err.message)
    }
})

module.exports=connection;