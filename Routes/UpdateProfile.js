const express=require("express")
const EditUserProfile  = require("../Controllers/EditUserProfile")
const Verify=require('../Middleware/Verify')

const route=express.Router()


route.route('/')
.patch(Verify,EditUserProfile)


module.exports=route