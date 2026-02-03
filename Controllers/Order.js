const mongoose = require('mongoose');
const Order = require('../Models/User_order');
const asyncHandler = require('express-async-handler');
const User = require('../Models/User');
const Admin = require('../Models/AdminOwner');
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
        paymentReference,
        delivery = {} 
    } = req.body;
    console.log(paymentReference)
    // --- 1. Basic Validations ---
    if (!Username) return res.status(400).json({ success: false, message: 'Username is required' });
    if (!Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ success: false, message: 'Order must contain items' });
    }

    const user = await User.findOne({ Username }).populate('UserProfileId').exec();
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    // --- 2. Group Items by Vendor (Company + Branch) ---
    // This is the key to privacy: Grouping items so we can create separate orders.
    const vendorGroups = {};

    items.forEach((it, index) => {
        const cId = Array.isArray(companyId) ? companyId[index] : companyId;
        const bId = Array.isArray(branchId) ? branchId[index] : branchId;
        const groupKey = `${cId}_${bId}`; // Unique key for each vendor/branch pair

        if (!vendorGroups[groupKey]) {
            vendorGroups[groupKey] = {
                companyId: cId,
                branchId: bId,
                items: [],
                subtotal: 0
            };
        }

        const price = Number(it.soldAtPrice) || 0;
        const quantity = Number(it.quantity || it.qty) || 0;
        
        vendorGroups[groupKey].items.push({
            productId: it.productId || null,
            ProductName: it.ProductName || '',
            ProductImg: Array.isArray(it.ProductImg) ? it.ProductImg : [it.ProductImg],
            Price: price,
            quantity,
            paymentReference,
            sku: it.sku || '',
            variant: it.variant || '',
            companyId: cId || null,
            branchId: bId || null
        });

        vendorGroups[groupKey].subtotal += (price * quantity);
    });

    // --- 3. Create Orders & Process Commissions ---
    const createdOrderIds = [];
    const updatePromises = [];

    // We loop through each vendor group to create a PRIVACY-PROTECTED order
    for (const key in vendorGroups) {
        const group = vendorGroups[key];
        
        // A. Create the Order document for THIS vendor only
        const orderForVendor = await Order.create({
            orderId: generateOrderId(),
            Username,
            Customer,
            paymentReference,
            companyId: [group.companyId], // Only their ID
            branchId: [group.branchId],   // Only their ID
            items: group.items,           // Only their items
            subtotal: group.subtotal,
            shippingCost: shippingCost / Object.keys(vendorGroups).length, // Split shipping
            tax: tax / Object.keys(vendorGroups).length,                  // Split tax
            total: group.subtotal + (shippingCost / Object.keys(vendorGroups).length),
            delivery: {
                location: {
                    lat: delivery?.lat || delivery?.location?.lat || null,
                    lng: delivery?.lng || delivery?.location?.lng || null
                }
            }
        });

        createdOrderIds.push(orderForVendor._id);

        // B. Create Sales records for this vendor
       const salesData = group.items.map(it => ({
    name: it.ProductName,
    soldAtPrice: it.Price,
    actualPrice: it.actualPrice || 0, // 🔥 ADDED THIS: Must match your Schema requirement
    quantity: it.quantity,
    TransactionType: 'Order',
    companyId: group.companyId,
    branchId: group.branchId,
    date: new Date(),
    paymentReference: paymentReference || it.paymentReference
}));

// Now this will succeed because actualPrice is present
const createdSales = await Sale.insertMany(salesData);
        // C. Calculate 20/80 Commission
        const commissionPool = group.subtotal; 
        const partnerShare = commissionPool * 0.20;
        const superAdminShare = commissionPool * 0.80;

        // D. Update Wallet & Relationships
        // 1. Give 20% to Partner Role
        updatePromises.push(User.updateMany({ Role: "Partner" }, { $push: { walletBalance: partnerShare } }));
        
        // 2. Give 80% to SuperAdmin Role
        updatePromises.push(Admin.updateMany({ Role: "SuperAdmin" }, { $push: { walletBalance: superAdminShare } }));

        // 3. Link Order to Company
        if (group.companyId && group.companyId !== "null") {
            updatePromises.push(Company.findByIdAndUpdate(group.companyId, {
                $push: { 
                    Orders: orderForVendor._id, 
                    SaleId: { $each: createdSales.map(s => s._id) } 
                }
            }));
        }

        // 4. Link Order to Branch
        if (group.branchId && group.branchId !== "null") {
            updatePromises.push(Branch.findByIdAndUpdate(group.branchId, {
                $push: { 
                    Orders: orderForVendor._id, 
                    SaleId: { $each: createdSales.map(s => s._id) } 
                }
            }));
        }
    }

    // --- 4. Final Updates ---
    // Attach all sub-orders to the User's Profile
    if (user.UserProfileId) {
        updatePromises.push(UserProfile.findByIdAndUpdate(user.UserProfileId, {
            $push: { orders: { $each: createdOrderIds } }
        }));
    }

    await Promise.all(updatePromises);

    return res.status(201).json({ 
        success: true, 
        message: `Checkout successful. ${createdOrderIds.length} orders created for different vendors.`,
        orderIds: createdOrderIds 
    });
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
  const { id } = req.params; // This could be the ID of ONE of the orders
  const { status, paymentStatus } = req.body;

  if (!id) return res.status(400).json({ success: false, message: "Order ID is required" });

  // 1️⃣ Find the "Target" order first to get the paymentReference
  const targetOrder = await Order.findById(id);
  if (!targetOrder) return res.status(404).json({ success: false, message: "Order not found" });

  // 2️⃣ Find ALL orders that share the same paymentReference
  // This ensures if there are 3 vendors, we find all 3 sub-orders.
  const relatedOrders = await Order.find({ 
    paymentReference: targetOrder.paymentReference 
  });

  const updatePromises = [];

  // 3️⃣ Loop through every related order
  for (const order of relatedOrders) {
    // Detect if THIS specific sub-order is transitioning to Paid
    const isBecomingPaid = paymentStatus === "Paid" && order.paymentStatus !== "Paid";

    // Update the status fields
    if (status) order.status = status;
    if (paymentStatus) order.paymentStatus = paymentStatus;
    await order.save();

    // 4️⃣ Credit Wallets ONLY for the owners of THIS specific sub-order
    if (isBecomingPaid) {
      const amountToCredit = order.total || 0;

      // Credit the Company (or companies) in this sub-order
      if (order.companyId && order.companyId.length > 0) {
        order.companyId.forEach(cId => {
          if (cId && cId.toString() !== "null") {
            updatePromises.push(
              Company.findByIdAndUpdate(cId, {
                $push: { walletBalance: amountToCredit }
              })
            )||updatePromises.push(
              Branch.findByIdAndUpdate(bId, {
                $push: { walletBalance: amountToCredit }
              })
            );
          }
        });
      }

      // Credit the Branch (or branches) in this sub-order
      if (order.companyId && order.companyId.length > 0) {
        order.companyId.forEach(bId => {
          if (bId && bId.toString() !== "null") {
            // updatePromises.push(
            //   Branch.findByIdAndUpdate(bId, {
            //     $push: { walletBalance: amountToCredit }
            //   })
            // );
          }
        });
      }
    }
  }

  // Execute all wallet credits at once
  if (updatePromises.length > 0) {
    await Promise.all(updatePromises);
  }

  return res.status(200).json({
    success: true,
    message: `Processed ${relatedOrders.length} related orders.`,
    data: {
      updatedCount: relatedOrders.length,
      reference: targetOrder.paymentReference
    }
  });
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