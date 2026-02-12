const Company = require('../Models/Company');
const Branch = require('../Models/Branch');
const billing = require('../Models/Billing');
const Admin = require('../Models/AdminOwner');
const asyncHandler = require('express-async-handler');

const GetBalance = asyncHandler(async (req, res) => {
    const id = req.userId;
    const role = req.role;
    // 1. Validation
    if(!id)return res.status(403).json({'message':'All field required'})
    // 2. Permission Check (Fixed logic)
    const allowedRoles = ['SuperAdmin', 'Partner'];
    if (!allowedRoles.includes(role)) {
        return res.status(403).json({ message: 'You are not allowed to see the balance of this company' });
    }

    // 3. Fetch Data (Finding either Company or Branch)
    const found = await Admin.findById(id) 

    if (!found) {
        return res.status(404).json({ message: 'Company or Branch not found' });
    }

    // 4. Filtering and Calculating Amounts
    // We assume 'Orders' is an array of objects with 'status' and 'amount' fields
    const orders = found.Orders || [];
    const billings =await billing.find().exec() 
    // const pendingProcessingOrders = orders.filter(order => 
    //     order.status === 'Pending' || order.status === 'Processing'
    // );

    // const shippedOrders = orders.filter(order => order.status === 'Shipped');

    // const totalPendingAmount = pendingProcessingOrders.reduce((sum, order) => sum + (order.total || 0), 0);
    const Balance = found.walletBalance.reduce((sum, order) => sum + order,0);

    // 5. Final Response
    res.status(200).json({
        success: true,
        walletBalance: found.walletBalance || 0, // Assuming your model has a walletBalance field
        // pendingData: {
        //     count: pendingProcessingOrders.length,
        //     totalAmount: totalPendingAmount
        // },
        transaction:orders,
         Balance,
         billings
        
    });
});

module.exports=GetBalance