const express=require("express")
const Order = require("../Controllers/Order")

const route=express.Router()


route.route('/')
.post(Order)

module.exports=route