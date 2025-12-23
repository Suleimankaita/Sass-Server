const express=require('express')
const route=express.Router()
const Verify=require('../Middleware/Verify')
const CreateBranch=require('../Controllers/CreateBranch')

route.route('/')
.post(Verify,CreateBranch)


module.exports=route