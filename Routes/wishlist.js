const express=require('express');
const route=express.Router()
const {GetWishilist,remove,createWishilist}=require('../Controllers/wishlist')
const verifyToken=require('../Middleware/Verify');
route.route('/Getwishlist')
.get(verifyToken,GetWishilist)
.post(verifyToken,createWishilist)

module.exports=route