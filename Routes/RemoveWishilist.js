const express=require('express');
const route=express.Router()
const {remove}=require('../Controllers/wishlist')
const verifyToken=require('../Middleware/Verify');
route.route('/:wishlistId')
.delete(verifyToken,remove)


module.exports=route