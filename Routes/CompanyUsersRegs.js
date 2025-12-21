const express=require("express")
const CompanyUsersRegs = require("../Controllers/CompanyUserReg")

const route=express.Router()


route.route('/')
.post(CompanyUsersRegs)

module.exports=route