const express=require('express');
const GetSale=require('../Controllers/GetSale')
const Verify=require('../Middleware/Verify')
const route=express.Router()

route.route('/')
.get(Verify,GetSale)

module.exports=route
