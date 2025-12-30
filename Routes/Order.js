const express=require("express")
const { createOrder, createOrderDebug } = require("../Controllers/Order")

const route=express.Router()


route.route('/')
.post(createOrder)

// debug route to quickly test DB write without client data
route.get('/debug', createOrderDebug)

module.exports=route