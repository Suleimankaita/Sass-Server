const express=require('express');
const GetCompanyProduct=require('../Controllers/GetCompanyProduct')
const route=express.Router()

route.route('/GetCompanyProduct')
.get(GetCompanyProduct)

module.exports=route
