const express=require("express")
const { getUserOrders } = require("../Controllers/Order")
const Verify=require('../Middleware/Verify')

const route=express.Router()


route.get('/:id', Verify,getUserOrders)

module.exports=route