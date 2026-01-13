const express=require("express")
const DeleteCategory = require("../Controllers/DeleteCategory")
const Verify = require('../Middleware/Verify');

const route=express.Router()


route.route('/')
.delete(Verify,DeleteCategory)

module.exports=route