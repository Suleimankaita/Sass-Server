const express=require("express")
const {ProductRegs} = require("../Controllers/productController")
const Verify=require('../Middleware/Verify')
const route=express.Router()


route.route('/')
.post(Verify,ProductRegs)

module.exports=route