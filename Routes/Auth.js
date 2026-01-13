const express=require("express")
const Auth = require("../Controllers/Auth")
const Verify=require('../Middleware/Verify')

const route=express.Router()


route.route('/')
.post(Auth)

module.exports=route