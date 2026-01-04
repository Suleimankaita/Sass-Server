    const express=require("express")
    const Sell=require("../Controllers/Sale")

    const route=express.Router()


    route.route('/')
    .post(Sell)

    module.exports=route