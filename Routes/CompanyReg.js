const express=require('express')
const route=express.Router()
const CompanyReg=require('../Controllers/CompanyReg')

route.route('/')
.post(CompanyReg)

module.exports=route