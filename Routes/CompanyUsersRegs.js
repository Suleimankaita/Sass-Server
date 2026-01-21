const express=require("express")
const CompanyUsersRegs = require("../Controllers/CompanyUserReg")
const verify =require('../Middleware/Verify')
const { checkUserLimit } = require('../Middleware/SubscriptionLimits')
const route=express.Router()


route.route('/')
.post(
    verify,
    checkUserLimit,
    CompanyUsersRegs)

module.exports=route