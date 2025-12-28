const express=require("express")
const UpdateCategories = require("../Controllers/UpdateCategories")

const route=express.Router()


route.route('/')
.patch(UpdateCategories)

module.exports=route