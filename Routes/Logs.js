const express=require('express')
const route=express.Router()
const Logs=require('../Controllers/UserLog')

route.route('/')
.post(Logs)

module.exports=route