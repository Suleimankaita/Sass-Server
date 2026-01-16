const express=require("express")
const CompanyUsersRegs = require("../Controllers/CompanyUserReg")
const verify =require('../Middleware/Verify')
const route=express.Router()


route.route('/')
.post(
    verify,
    CompanyUsersRegs)

module.exports=route