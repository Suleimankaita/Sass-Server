// controllers/cartController.js
const User = require("../Models/Userprofile");
const UserDeal = require("../Models/Cart");
const EcomerceProducts = require("../Models/EcomerceProducts");
const asyncHandler = require("express-async-handler");
const mongoose = require("mongoose");

// Helper to resolve user and cart
async function resolveUserAndCart(req, targetUserId) {
    const requesterId = req.userId || (req.user && req.user._id);
    const requesterType = req.userType || (req.user && req.user.Role) || "User";
    const canOverride = (t) => t === "Admin" || t === "CompanyUser";

    const effectiveUserId = (targetUserId && canOverride(requesterType)) ? targetUserId : requesterId;
    if (!effectiveUserId) return { effectiveUserId: null, profile: null, cart: null };

    const profile = await User.findById(effectiveUserId).exec();

    // Fetch user's cart items from UserDeal
    const cart = await UserDeal.find({ userId: effectiveUserId, status: 'claimed' }).exec();

    return { effectiveUserId, profile, cart };
}

// Add item to cart
const addToCart = asyncHandler(async (req, res) => {
    const targetUserId = req.body.targetUserId || req.query.targetUserId;
    const { effectiveUserId, profile } = await resolveUserAndCart(req, targetUserId);

    if (!effectiveUserId) return res.status(401).json({ message: "Unauthorized" });

    const {
        productId,
        dealId,
        quantity = 1,
        dealPrice = 0,
        originalPrice = 0,
        name,
        img,
        price,
        discount = 0
    } = req.body;
    console.log("Add to cart request body:", req.body);
    if (!productId && !dealId) return res.status(400).json({ message: "productId or dealId is required" });

    const qty = Math.max(1, parseInt(quantity, 10) || 1);

    // Check if user already has this product/deal
    let cartItem = await UserDeal.findOne({
        userId: effectiveUserId,
        productId: productId || null,
        dealId: dealId || null,
        status: 'claimed'
    });

    if (cartItem) {
        // Update quantity and prices
        cartItem.quantity += qty;
        cartItem.dealPrice = dealPrice !== undefined ? dealPrice : cartItem.dealPrice;
        cartItem.originalPrice = originalPrice !== undefined ? originalPrice : cartItem.originalPrice;
        cartItem.discount = discount !== undefined ? discount : cartItem.discount;
        await cartItem.save();
    } else {
        // Create new cart item
        cartItem = new UserDeal({
            userId: effectiveUserId,
            productId: productId || undefined,
            dealId: dealId || undefined,
            quantity: qty,
            dealPrice,
            name,
            img,
            originalPrice,
            price,
            discount
        });
        await cartItem.save();
    }

    // Link CartId to user profile if not linked
    if (profile && !profile.CartId) {
        profile.CartId = effectiveUserId; // Optional: we can keep CartId as userId for reference
        await profile.save();
    }

    // Return updated cart
    const updatedCart = await UserDeal.find({ userId: effectiveUserId, status: 'claimed' }).exec();
    return res.status(200).json(updatedCart);
});

// Get cart
const getCart = asyncHandler(async (req, res) => {
    const targetUserId = req.query.targetUserId || req.body.targetUserId;
    const { effectiveUserId } = await resolveUserAndCart(req, targetUserId);

    if (!effectiveUserId) return res.status(401).json({ message: "Unauthorized" });

  const cart = await UserDeal.find({
userId: effectiveUserId,
status: 'claimed'
}).lean();


// Extract product IDs
    const productIds = cart.map(item => item.productId);


    // Fetch all products at once
    const products = await EcomerceProducts.find({
    _id: { $in: productIds }
    }).lean();


    // Merge cart + product data
    const mergedCart = cart.map(cartItem => {
    const product = products.find(
    p => p._id.toString() === cartItem.productId.toString()
    );


return {
...cartItem,
product
};
});


return res.status(200).json(mergedCart);
});

// Update item quantity
const updateItemQuantity = asyncHandler(async (req, res) => {
  const targetUserId = req.body.targetUserId || req.query.targetUserId;
  const { effectiveUserId } = await resolveUserAndCart(req, targetUserId);

  if (!effectiveUserId) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const { productId, quantity } = req.body;

  if (!productId) {
    return res.status(400).json({ message: "productId is required" });
  }

  const qty = Number(quantity);
  if (![1, -1].includes(qty)) {
    return res.status(400).json({
      message: "quantity must be 1 (increment) or -1 (decrement)",
    });
  }

  // Atomic increment / decrement
  const item = await UserDeal.findOneAndUpdate(
    {
      userId: effectiveUserId,
      _id:productId,
      status: "claimed",
    },
    {
      $inc: { quantity: qty === 1 ? 1 : -1 },
    },
    { new: true }
  );

  if (!item) {
    return res.status(404).json({ message: "Item not in cart" });
  }

  // Auto remove if quantity <= 0
  if (item.quantity <= 0) {
    await item.deleteOne();
  } else if (item.unitPrice) {
    item.totalPrice = item.unitPrice * item.quantity;
    await item.save();
  }

  const updatedCart = await UserDeal.find({
    userId: effectiveUserId,
    status: "claimed",
  });

  return res.status(200).json(updatedCart);
});

// Remove item
const removeItem = asyncHandler(async (req, res) => {
    const targetUserId = req.body.targetUserId || req.query.targetUserId;
    const { effectiveUserId } = await resolveUserAndCart(req, targetUserId);

    if (!effectiveUserId) return res.status(401).json({ message: "Unauthorized" });

    const { productId, dealId } = req.body;
    if (!productId ) return res.status(400).json({ message: "productId  is required" });

    const cartItem = await UserDeal.findOne({
        userId: effectiveUserId,
        _id: productId || null,
        // dealId: dealId || null,
        status: 'claimed'
    });

    if (!cartItem) return res.status(404).json({ message: "Item not found" });

    await cartItem.deleteOne();

    const updatedCart = await UserDeal.find({ userId: effectiveUserId, status: 'claimed' }).exec();
    return res.status(200).json(updatedCart);
});

// Clear cart
const clearCart = asyncHandler(async (req, res) => {
    const targetUserId = req.body.targetUserId || req.query.targetUserId;
    const { effectiveUserId } = await resolveUserAndCart(req, targetUserId);

    if (!effectiveUserId) return res.status(401).json({ message: "Unauthorized" });

    await UserDeal.deleteMany({ userId: effectiveUserId, status: 'claimed' });

    return res.status(200).json([]);
});

module.exports = {
    addToCart,
    getCart,
    updateItemQuantity,
    removeItem,
    clearCart
};
