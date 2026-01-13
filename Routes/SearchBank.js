    const express=require("express")
    const {resolveAccount}=require("../Controllers/List_banks")
const Verify=require('../Middleware/Verify')

    const route=express.Router()


    route.route('/')
    .post(resolveAccount)

    module.exports=route