const express=require('express');
const GetBranusers=require('../Controllers/GetBranusers')
const Verify=require('../Middleware/Verify')
const route=express.Router()

route.route('/')
.get(Verify,GetBranusers)

module.exports=route
