const mongoose = require('mongoose');
const Order = require('../Models/User_order');
const asyncHandler = require('express-async-handler');
const User = require('../Models/User');
const UserProfile = require('../Models/Userprofile');
const Company = require('../Models/Company');
const Branch = require('../Models/Branch');
const Sale=require('../Models/SaleShema');
function generateOrderId() {
    const ts = Date.now().toString(36);
    const rand = Math.floor(Math.random() * 1e6).toString(36);
    return `ORD-${ts}-${rand}`.toUpperCase();
}

const createOrder = asyncHandler(async (req, res) => {
    const {
        Username,
        companyId, // Array of IDs from frontend
        branchId,  // Array of IDs from frontend
        Customer = {},
        items = [],
        shippingCost = 0,
        tax = 0,
        delivery = {} 
    } = req.body;

    // --- 1. Basic Validations ---
    if (!Username) return res.status(400).json({ success: false, message: 'Username is required' });
    if (!Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ success: false, message: 'Order must contain items' });
    }

    const user = await User.findOne({ Username }).populate('UserProfileId').exec();
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    // --- 2. Process Items and Link IDs ---
    let subtotal = 0;
    const salesToCreate = [];
    const orderItems = [];
    const uniqueCompanyIds = new Set();
    const uniqueBranchIds = new Set();

    items.forEach((it, index) => {
        // Safe extraction: if companyId is an array, take index. If string, take string.
        const cId = Array.isArray(companyId) ? companyId[index] : companyId;
        const bId = Array.isArray(branchId) ? branchId[index] : branchId;

        // Clean up: only add to sets if the ID actually exists
        if (cId) uniqueCompanyIds.add(cId.toString());
        if (bId) uniqueBranchIds.add(bId.toString());

        const price = Number(it.soldAtPrice) || 0;
        const quantity = Number(it.quantity || it.qty) || 0;
        subtotal += price * quantity;

        // Prepare Sale (Specific to this item's company/branch)
        salesToCreate.push({
            name: it.ProductName,
            soldAtPrice: price,
            productType: it.productType || '',
            Categorie: it.categoryName || it.category || '',
            quantity,
            TransactionType: 'Order',
            actualPrice: it.actualPrice || 0,
            companyId: cId || null,
            branchId: bId || null,
            date: new Date()
        });

        // Prepare Order Item
        orderItems.push({
            productId: it.productId || null,
            ProductName: it.ProductName || '',
            ProductImg: Array.isArray(it.ProductImg) ? it.ProductImg : [it.ProductImg],
            Price: price,
            quantity,
            sku: it.sku || '',
            variant: it.variant || '',
            companyId: cId || null, // Link at item level
            branchId: bId || null
        });
    });

    // --- 3. Database Writes ---
    const createdSales = await Sale.insertMany(salesToCreate);
    const saleIds = createdSales.map(s => s._id);

    const total = subtotal + Number(shippingCost) + Number(tax);

    const createdOrder = await Order.create({
        orderId: generateOrderId(), 
        Username,
        Customer,
        // Store all unique companies/branches involved in this multi-vendor order
        companyId: Array.from(uniqueCompanyIds), 
        branchId: Array.from(uniqueBranchIds),
        items: orderItems,
        subtotal,
        shippingCost,
        tax,
        total,
        delivery: {
            location: {
                lat: delivery?.lat || delivery?.location?.lat || null,
                lng: delivery?.lng || delivery?.location?.lng || null
            }
        }
    });

    // --- 4. Update Relationships (The Fix) ---
    const updatePromises = [];

    // User Update
    if (user.UserProfileId) {
        updatePromises.push(UserProfile.findByIdAndUpdate(user.UserProfileId, {
            $push: { orders: createdOrder._id }
        }));
    }

    // Company Updates: Only update if valid IDs exist
    uniqueCompanyIds.forEach(id => {
        if (!id || id === "null") return; // Skip invalid IDs
        
        // Find sales belonging ONLY to this specific company
        const companySales = createdSales
            .filter(s => s.companyId && s.companyId.toString() === id)
            .map(s => s._id);

        updatePromises.push(Company.findByIdAndUpdate(id, {
            $push: { 
                Orders: createdOrder._id, 
                SaleId: { $each: companySales } 
            }
        }));
    });

    // Branch Updates: Only update if valid IDs exist
    uniqueBranchIds.forEach(id => {
        if (!id || id === "null") return;

        const branchSales = createdSales
            .filter(s => s.branchId && s.branchId.toString() === id)
            .map(s => s._id);

        updatePromises.push(Branch.findByIdAndUpdate(id, {
            $push: { 
                Orders: createdOrder._id, 
                SaleId: { $each: branchSales } 
            }
        }));
    });

    await Promise.all(updatePromises);

    // --- 5. Return Populated Result ---
    const populatedOrder = await Order.findById(createdOrder._id)
        .populate('companyId', 'name')
        .populate('branchId', 'name');

    return res.status(201).json({ success: true, data: populatedOrder });
});
const getOrder = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const order = await Company.findById(id).populate('companyId').populate('branchId');
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
    return res.status(200).json({ success: true, data: order });
});
const getCompanyOrder = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const Companyorder = await Company.findById(id).populate('Orders')||await Branch.findById(id).populate('Orders');
    if (!Companyorder) return res.status(404).json({ success: false, message: 'Company Order not found' });
    return res.status(200).json({ success: true, data: Companyorder.Orders });
});
const getUserOrders = asyncHandler(async (req, res) => {
    const { id } = req.params;
    
    if(!id)return res.status(400).json({success:false,message:'UserId is required'})
    const UsesOrders = await User.findById(id).populate({
        path: 'UserProfileId',
        populate: { path: 'orders', model: 'Order' }
    });
    if (!UsesOrders) return res.status(404).json({ success: false, message: 'No order to display' });

    const finalOrders = UsesOrders.UserProfileId.orders.map(res=>{
        return {
            item:res?.items,
            status:res?.status,
            total:res?.total,
            orderId:res?.orderId,
            createdAt:res?.createdAt,  
            paymentStatus:res?.paymentStatus,
            _id:res?._id,
            shippingCost:res?.shippingCost,
            tax:res?.tax,
            customer:res?.Customer,
            delivery:res?.delivery.location
        }
    }); 
    
    return res.status(200).json({ success: true, data:finalOrders });
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
    if (!id) return res.status(400).json({ success: false, message: 'Order ID is required' });
    if (!status && !paymentStatus) {
        return res.status(400).json({ success: false, message: 'At least one of status or paymentStatus must be provided' });
    }
    const order = await Order.findById(id);
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
    if (status) order.status = status;
    if (paymentStatus) order.paymentStatus = paymentStatus;
    await order.save();
    const populated = await Order.findById(order._id).populate('companyId').populate('branchId');
    return res.status(200).json({ success: true, data: order });
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

const findOrder=asyncHandler(async(req,res)=>{
    const {id} =req.params;
    if(!id)return res.status(400).json({'message':'Orderid is required'});
    
    const foundOrder=await Order.findById(id);
    res.status(201).json(foundOrder)
})

module.exports = {
    createOrder,
    getOrder,
    listOrders,
    updateOrderStatus,
    createOrderDebug,
    getUserOrders,
    getCompanyOrder,
    findOrder
};