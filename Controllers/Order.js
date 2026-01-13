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

    const user = await User.findOne({ Username }).populate('UserProfileId').exec();
    console.log(user)

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

    const normalizedItems = items.map(async (it) => {
        const price = Number(it.soldAtPrice );
        const quantity = Number(it.quantity || it.qty);

        if (!price || price <= 0) throw new Error('Invalid price');
        if (!quantity || quantity <= 0) throw new Error('Invalid quantity');

        subtotal += price * quantity;
        console.log(it.productId)
        const sale = await Sale.create({
            name: it.ProductName,
            soldAtPrice: price,
            productType: it.productType || '',
            Categorie: it.Categorie || '',
            quantity,
            TransactionType: 'Order',
            actualPrice: it.actualPrice || 0
        });
        if (company){

            company.SaleId.push(sale._id)
        }else if(branch){
            branch.SaleId.push(sale._id)
        }
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

    // Ensure the user has a UserProfile document. If missing, create one.
    if (!user.UserProfileId) {
        const fullName = [user.Firstname, user.Lastname].filter(Boolean).join(' ').trim() || undefined;
        const profilePayload = { Email: user.Username, fullName };
        const newProfile = await UserProfile.create(profilePayload);
        user.UserProfileId = newProfile._id;
        await user.save();
        newProfile.orders = [createdOrder._id];
        await newProfile.save();
    } else {
        // If populated, it's the document; otherwise fetch the profile doc
        let profileDoc = user.UserProfileId;
        if (!profileDoc || !profileDoc.orders) {
            profileDoc = await UserProfile.findById(user.UserProfileId) || null;
        }
        if (profileDoc) {
            profileDoc.orders = profileDoc.orders || [];
            profileDoc.orders.push(createdOrder._id);
            await profileDoc.save();
        }
    }

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
            customer:res?.Customer  
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

module.exports = {
    createOrder,
    getOrder,
    listOrders,
    updateOrderStatus,
    createOrderDebug,
    getUserOrders,
    getCompanyOrder
};