const express=require("express")
const AddCategories = require("../Controllers/AddCategories")
const Verify=require('../Middleware/Verify')
const route=express.Router()


route.route('/')
.post(Verify,AddCategories)

module.exports=route