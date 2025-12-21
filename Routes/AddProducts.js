const express=require("express")
const AddProducts = require("../Controllers/AddProducts")

const route=express.Router()


route.route('/')
.post(AddProducts)

module.exports=route