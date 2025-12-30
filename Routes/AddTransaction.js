const express=require("express")
const {addTransaction,getTransactions} = require("../Controllers/Transaction")

const route=express.Router()


route.route('/')
.get(getTransactions)
.post(addTransaction)

module.exports=route