const express=require("express")
const { UpdateProduct } = require("../Controllers/productController")
const Verify=require('../Middleware/Verify')

const route=express.Router()


route.route('/')
.patch(UpdateProduct)


module.exports=route