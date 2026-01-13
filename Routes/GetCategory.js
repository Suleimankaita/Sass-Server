const express=require('express');
const {getCategories}=require('../Controllers/GetCategories')
const Verify=require('../Middleware/Verify')
const route=express.Router()

route.route('/')
.get(Verify,getCategories)

module.exports=route
