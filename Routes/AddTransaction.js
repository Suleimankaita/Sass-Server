const express=require("express")
const {addTransaction,getTransactions} = require("../Controllers/Transaction")
const Verify=require('../Middleware/Verify')

const route=express.Router()


route.route('/')
.get(Verify,getTransactions)
.post(Verify,addTransaction)

module.exports=route