const express=require("express")
const AddCategories = require("../Controllers/AddCategories")

const route=express.Router()


route.route('/')
.post(AddCategories)

module.exports=route