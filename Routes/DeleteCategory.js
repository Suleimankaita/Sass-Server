const express=require("express")
const DeleteCategory = require("../Controllers/DeleteCategory")

const route=express.Router()


route.route('/')
.delete(DeleteCategory)

module.exports=route