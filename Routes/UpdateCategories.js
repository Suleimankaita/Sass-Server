const express=require("express")
const UpdateCategories = require("../Controllers/UpdateCategories")
const Verify=require('../Middleware/Verify')

const route=express.Router()


route.route('/')
.patch(Verify,UpdateCategories)

module.exports=route