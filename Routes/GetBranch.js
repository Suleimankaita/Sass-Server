const express=require('express')
const route=express.Router()
const Verify=require('../Middleware/Verify')
const GetBranche=require('../Controllers/GetBranche')

route.route('/')
.get(Verify,GetBranche)


module.exports=route