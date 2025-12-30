const express = require('express');
const router = express.Router();
const Verify = require('../Middleware/Verify');
const CartController = require('../Controllers/Cart');

// Add item to cart
router.post('/add', Verify, CartController.addToCart);

// Get current user's cart (admins/company users can pass ?targetUserId=<id>)
router.get('/', Verify, CartController.getCart);

// Update quantity (body: productId, quantity, optional targetUserId)
router.put('/update', Verify, CartController.updateItemQuantity);

// Remove an item (body: productId, optional color/size, optional targetUserId)
router.delete('/remove', Verify, CartController.removeItem);

// Clear entire cart
router.delete('/clear', Verify, CartController.clearCart);

module.exports = router;
