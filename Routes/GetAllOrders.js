const express=require('express');
const GetAllOrders=require('../Controllers/GetAllOrders')
const Verify=require('../Middleware/Verify')
const route=express.Router()

route.route('/')
.get(GetAllOrders)

module.exports=route
