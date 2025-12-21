const express=require("express")
const Auth = require("../Controllers/CompanyAuth")

const route=express.Router()


route.route('/')
.post(Auth)

module.exports=route