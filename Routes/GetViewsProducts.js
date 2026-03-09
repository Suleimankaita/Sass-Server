const express=require('express')
const GetProductsView=require('../Controllers/GetViewAllproducts')
const Verify=require('../Middleware/Verify')
const Router=express();

Router.route('/')
.get(GetProductsView)

module.exports=Router