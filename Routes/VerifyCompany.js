    const express=require("express")
    const Verify = require("../Controllers/CompanyVerify")

    const route=express.Router()


    route.route('/')
    .patch(Verify)

    module.exports=route