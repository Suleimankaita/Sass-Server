    const express=require("express")
    const UserReg = require("../Controllers/UserReg")

    const route=express.Router()


    route.route('/')
    .post(UserReg)

    module.exports=route