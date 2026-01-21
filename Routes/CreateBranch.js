const express=require('express')
const route=express.Router()
const Verify=require('../Middleware/Verify')
const CreateBranch=require('../Controllers/CreateBranch')
const { checkBranchLimit } = require('../Middleware/SubscriptionLimits')

route.route('/')
.post(Verify, checkBranchLimit, CreateBranch)


module.exports=route