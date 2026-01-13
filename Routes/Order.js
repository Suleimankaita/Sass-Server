const express=require("express")
const { createOrder, createOrderDebug,getOrder,listOrders,getUserOrders,getCompanyOrder } = require("../Controllers/Order")
const Verify=require('../Middleware/Verify')

const route=express.Router()


route.route('/Create')
.post(Verify,createOrder)

// debug route to quickly test DB write without client data
route.get('/debug',Verify, createOrderDebug)
route.get('/:id',Verify, getOrder)
route.get('/listOrders/:id',Verify, getCompanyOrder)

module.exports=route