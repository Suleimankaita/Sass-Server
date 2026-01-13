const express=require("express")
const { updateOrderStatus } = require("../Controllers/Order")
const Verify=require('../Middleware/Verify')

const route=express.Router()


route.route('/:id')
.patch(Verify,updateOrderStatus)


module.exports=route