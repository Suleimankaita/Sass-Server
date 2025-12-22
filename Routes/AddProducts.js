const express=require("express")
const {ProductRegs} = require("../Controllers/productController")

const route=express.Router()


route.route('/')
.post(ProductRegs)

module.exports=route