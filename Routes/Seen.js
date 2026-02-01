const express=require("express")
const Seen=require("../Controllers/Seen")
const Verify=require('../Middleware/Verify')

    const route=express.Router()


    route.route('/')
    .post(Verify,Seen)

    module.exports=route