    const express=require("express")
    const transaction=require("../Controllers/Tranfer_tobank")
const Verify=require('../Middleware/Verify')

    const route=express.Router()


    route.route('/')
    .post(transaction)

    module.exports=route