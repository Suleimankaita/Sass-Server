const express=require("express")
const Auth = require("../Controllers/CompanyUserAuth")

const route=express.Router()


route.route('/')
.post(Auth)

module.exports=route