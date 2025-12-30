const User = require("../Models/Userprofile");
const Cart = require("../Models/Cart");
const asynchandler = require("express-async-handler");

// Helper to determine which user/cart to operate on.
// Allows admin/company users to pass `targetUserId` in body/query to operate on other users' carts.
async function resolveUserAndCart(req, targetUserId) {
	const requesterId = req.userId || (req.user && req.user._id);
	const requesterType = req.userType || (req.user && req.user.Role) || "User";
	const canOverride = (t) => t === "Admin" || t === "CompanyUser";

	const effectiveUserId = (targetUserId && canOverride(requesterType)) ? targetUserId : requesterId;

	let profile = null;
	if (effectiveUserId) profile = await User.findById(effectiveUserId).exec();

	let cart = null;
	if (profile && profile.CartId) {
		cart = await Cart.findById(profile.CartId).exec();
	}

	if (!cart && effectiveUserId) {
		cart = await Cart.findOne({ userId: effectiveUserId }).exec();
	}

	return { effectiveUserId, profile, cart };
}

// Add item to cart (create cart if not exists)
const addToCart = asynchandler(async (req, res) => {
	const targetUserId = req.body.targetUserId || req.query.targetUserId;
	const { effectiveUserId, profile, cart: existingCart } = await resolveUserAndCart(req, targetUserId);

	if (!effectiveUserId) return res.status(401).json({ message: "Unauthorized" });

	const {
		productId,
		quantity = 1,
		name,
		price,
		oldPrice,
		discount,
		color,
		size,
		img,
	} = req.body;

	if (!productId) return res.status(400).json({ message: "productId is required" });

	const qty = Math.max(1, parseInt(quantity, 10) || 1);

	const newItem = {
		productId,
		name,
		price,
		oldPrice,
		discount,
		color,
		size,
		quantity: qty,
		img,
	};

	let cart = existingCart;
	if (!cart) {
		cart = new Cart({ userId: effectiveUserId, items: [newItem] });
		await cart.save();
		if (profile && (!profile.CartId || String(profile.CartId) !== String(cart._id))) {
			profile.CartId = cart._id;
			await profile.save();
		}
		return res.status(201).json(cart);
	}

	const idx = cart.items.findIndex((i) =>
		String(i.productId) === String(productId) &&
		(i.color || "") === (color || "") &&
		(i.size || "") === (size || "")
	);

	if (idx > -1) {
		cart.items[idx].quantity = (cart.items[idx].quantity || 0) + qty;
		if (name) cart.items[idx].name = name;
		if (price !== undefined) cart.items[idx].price = price;
		if (img) cart.items[idx].img = img;
	} else {
		cart.items.push(newItem);
	}

	cart.updatedAt = Date.now();
	await cart.save();
	return res.status(200).json(cart);
});

// Get cart for current user (admin/company can pass targetUserId)
const getCart = asynchandler(async (req, res) => {
	const targetUserId = req.query.targetUserId || req.body.targetUserId;
	const { effectiveUserId, profile, cart } = await resolveUserAndCart(req, targetUserId);

	if (!effectiveUserId) return res.status(401).json({ message: "Unauthorized" });

	if (!cart) return res.status(200).json({ items: [] });
	return res.status(200).json(cart);
});

// Update quantity of an item (set absolute quantity)
const updateItemQuantity = asynchandler(async (req, res) => {
	const targetUserId = req.body.targetUserId || req.query.targetUserId;
	const { effectiveUserId, profile, cart } = await resolveUserAndCart(req, targetUserId);

	if (!effectiveUserId) return res.status(401).json({ message: "Unauthorized" });

	const { productId, quantity, color, size } = req.body;
	if (!productId) return res.status(400).json({ message: "productId is required" });

	if (!cart) return res.status(404).json({ message: "Cart not found" });

	const idx = cart.items.findIndex((i) =>
		String(i.productId) === String(productId) &&
		(i.color || "") === (color || "") &&
		(i.size || "") === (size || "")
	);

	if (idx === -1) return res.status(404).json({ message: "Item not in cart" });

	const qty = parseInt(quantity, 10);
	if (isNaN(qty) || qty < 0) return res.status(400).json({ message: "Invalid quantity" });

	if (qty === 0) {
		cart.items.splice(idx, 1);
	} else {
		cart.items[idx].quantity = qty;
	}

	cart.updatedAt = Date.now();
	await cart.save();
	return res.status(200).json(cart);
});

// Remove single item
const removeItem = asynchandler(async (req, res) => {
	const targetUserId = req.body.targetUserId || req.query.targetUserId;
	const { effectiveUserId, profile, cart } = await resolveUserAndCart(req, targetUserId);

	if (!effectiveUserId) return res.status(401).json({ message: "Unauthorized" });

	const { productId, color, size } = req.body;
	if (!productId) return res.status(400).json({ message: "productId is required" });

	if (!cart) return res.status(404).json({ message: "Cart not found" });

	const before = cart.items.length;
	cart.items = cart.items.filter((i) => !(
		String(i.productId) === String(productId) &&
		(i.color || "") === (color || "") &&
		(i.size || "") === (size || "")
	));

	if (cart.items.length === before) return res.status(404).json({ message: "Item not found" });

	cart.updatedAt = Date.now();
	await cart.save();
	return res.status(200).json(cart);
});

// Clear entire cart
const clearCart = asynchandler(async (req, res) => {
	const targetUserId = req.body.targetUserId || req.query.targetUserId;
	const { effectiveUserId, profile, cart } = await resolveUserAndCart(req, targetUserId);

	if (!effectiveUserId) return res.status(401).json({ message: "Unauthorized" });

	if (!cart) return res.status(200).json({ items: [] });

	cart.items = [];
	cart.updatedAt = Date.now();
	await cart.save();
	return res.status(200).json(cart);
});

module.exports = {
	addToCart,
	getCart,
	updateItemQuantity,
	removeItem,
	clearCart,
};