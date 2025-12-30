const mongoose = require('mongoose');
const Order = require('../Models/User_order');
const asyncHandler = require('express-async-handler');
const User = require('../Models/User');
const Company = require('../Models/Company');
const Branch = require('../Models/Branch');

function generateOrderId() {
    const ts = Date.now().toString(36);
    const rand = Math.floor(Math.random() * 1e6).toString(36);
    return `ORD-${ts}-${rand}`.toUpperCase();
}

const createOrder = asyncHandler(async (req, res) => {
    const {
        Username,
        companyId,
        branchId,
        Customer = {},
        items = [],
        shippingCost = 0,
        tax = 0,
        delivery = {} // <-- client must send lat/lng
    } = req.body;

    if (!Username) {
        return res.status(400).json({ success: false, message: 'Username is required' });
    }

    if (!Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ success: false, message: 'Order must contain items' });
    }

    const user = await User.findOne({ Username });
    if (!user) {
        return res.status(404).json({ success: false, message: 'User not found' });
    }

    let company = null;
    let branch = null;

    if (companyId) {
        company = await Company.findById(companyId);
        if (!company) {
            return res.status(404).json({ success: false, message: 'Company not found' });
        }
    }

    if (branchId) {
        branch = await Branch.findById(branchId);
        if (!branch) {
            return res.status(404).json({ success: false, message: 'Branch not found' });
        }
        if (!company && branch.CompanyId) {
            company = await Company.findById(branch.CompanyId);
        }
    }

    let subtotal = 0;

    const normalizedItems = items.map(it => {
        const price = Number(it.Price || it.price);
        const quantity = Number(it.quantity || it.qty);

        if (!price || price <= 0) throw new Error('Invalid price');
        if (!quantity || quantity <= 0) throw new Error('Invalid quantity');

        subtotal += price * quantity;

        return {
            productId: it.productId || null,
            ProductName: it.ProductName || '',
            ProductImg: Array.isArray(it.ProductImg) ? it.ProductImg : [],
            Price: price,
            quantity,
            sku: it.sku || '',
            variant: it.variant || ''
        };
    });

    const shipping = Number(shippingCost);
    const taxAmt = Number(tax);
    const total = subtotal + shipping + taxAmt;

    const orderPayload = {
        orderId: generateOrderId(),
        Username,
        Customer,
        companyId: company?._id,
        branchId: branch?._id,
        items: normalizedItems,
        subtotal,
        shippingCost: shipping,
        tax: taxAmt,
        total,
        delivery: {
            location: {
                lat: delivery?.lat || null,
                lng: delivery?.lng || null
            }
        }
    };

    const createdOrder = await Order.create(orderPayload);

    user.OrderId = user.OrderId || [];
    user.OrderId.push(createdOrder._id);
    await user.save();

    if (company) {
        company.Orders = company.Orders || [];
        company.Orders.push(createdOrder._id);
        await company.save();
    }

    if (branch) {
        branch.Orders = branch.Orders || [];
        branch.Orders.push(createdOrder._id);
        await branch.save();
    }

    const populated = await Order.findById(createdOrder._id)
        .populate('companyId')
        .populate('branchId');

    return res.status(201).json({ success: true, data: populated });
});
 
const getOrder = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const order = await Order.findById(id).populate('companyId').populate('branchId');
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
    return res.status(200).json({ success: true, data: order });
});

const listOrders = asyncHandler(async (req, res) => {
    const { limit = 50, skip = 0, companyId, branchId, username } = req.query;
    const filter = {};
    if (companyId) filter.companyId = companyId;
    if (branchId) filter.branchId = branchId;
    if (username) filter.Username = username;
    const orders = await Order.find(filter)
        .sort({ createdAt: -1 })
        .skip(Number(skip))
        .limit(Math.min(Number(limit), 1000))
        .populate('companyId')
        .populate('branchId');
    return res.status(200).json({ success: true, data: orders });
});

const updateOrderStatus = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { status, paymentStatus } = req.body;
    const order = await Order.findById(id);
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
    if (status) order.status = status;
    if (paymentStatus) order.paymentStatus = paymentStatus;
    await order.save();
    const populated = await Order.findById(order._id).populate('companyId').populate('branchId');
    return res.status(200).json({ success: true, data: populated });
});

// Debug helper: create a minimal order and report DB state
const createOrderDebug = asyncHandler(async (req, res) => {
    try {
        console.log('createOrderDebug: mongoose state=', mongoose.connection.readyState);
        const payload = {
            orderId: generateOrderId(),
            Username: 'DEBUG_' + Date.now(),
            items: [{ ProductName: 'DebugItem', Price: 1, quantity: 1 }],
            subtotal: 1,
            shippingCost: 0,
            tax: 0,
            total: 1,
        };
        const created = await Order.create(payload);
        console.log('createOrderDebug created id=', created._id.toString());
        return res.status(201).json({ success: true, data: created, mongooseState: mongoose.connection.readyState });
    } catch (err) {
        console.error('createOrderDebug error:', err);
        return res.status(500).json({ success: false, message: 'Debug create failed', error: err.message, mongooseState: mongoose.connection.readyState });
    }
});

module.exports = {
    createOrder,
    getOrder,
    listOrders,
    updateOrderStatus,
    createOrderDebug,
};