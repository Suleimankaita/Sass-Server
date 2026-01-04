const express=require('express');
const GetCompanyProduct=require('../Controllers/GetCompanyProduct')
const Verify=require('../Middleware/Verify')
const route=express.Router()

route.route('/GetCompanyProduct')
.get(Verify,GetCompanyProduct)

module.exports=route
