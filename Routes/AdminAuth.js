const express=require("express")
const AdminAuth = require("../Controllers/AdminAuth")

const route=express.Router()


route.route('/')
.post(AdminAuth)

module.exports=route