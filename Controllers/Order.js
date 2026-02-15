const mongoose = require('mongoose');
const Order = require('../Models/User_order');
const asyncHandler = require('express-async-handler');
const User = require('../Models/User');
const Admin = require('../Models/AdminOwner');
const CompanyUser= require('../Models/CompanyUsers');
const nodemailer = require('nodemailer');
const UserProfile = require('../Models/Userprofile');
const Company = require('../Models/Company');
const Branch = require('../Models/Branch');
const EcomerceProducts = require('../Models/EcomerceProducts');
const Sale=require('../Models/SaleShema');
const Deals=require("../Models/Deals");

function generateOrderId() {
    const ts = Date.now().toString(36);
    const rand = Math.floor(Math.random() * 1e6).toString(36);
    return `ORD-${ts}-${rand}`.toUpperCase();
}

// --- 1. Email Design Wrapper ---


// --- 2. Main Controller ---

// --- 1. Beautiful Email UI Wrapper ---
// This handles the layout, logo, and centering for all emails
const emailWrapper = (content, title) => `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        body { margin: 0; padding: 0; background-color: #f1f5f9; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; }
        .wrapper { width: 100%; table-layout: fixed; background-color: #f1f5f9; padding-bottom: 40px; }
        .main-table { background-color: #ffffff; margin: 0 auto; width: 100%; max-width: 600px; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); }
        .header { background-color: #1e293b; padding: 30px 20px; text-align: center; }
        .logo { width: 150px; height: auto; display: block; margin: 0 auto; }
        .content { padding: 40px 30px; color: #334155; line-height: 1.6; }
        .h1 { font-size: 22px; font-weight: 700; color: #0f172a; margin: 0 0 20px; text-align: center; }
        .highlight-box { background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin: 25px 0; text-align: center; }
        .amount { font-size: 24px; font-weight: 800; color: #4f46e5; margin: 10px 0 0; display: block; }
        .label { font-size: 13px; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600; }
        .footer { background-color: #f1f5f9; padding: 20px; text-align: center; color: #94a3b8; font-size: 12px; }
    </style>
</head>
<body>
    <div class="wrapper">
        <table class="main-table" cellspacing="0" cellpadding="0">
            <tr>
                <td class="header">
                     <img src="cid:ysstorelogo" alt="YSStore" class="logo" />
                </td>
            </tr>
            <tr>
                <td class="content">
                    <h1 class="h1">${title}</h1>
                    ${content}
                </td>
            </tr>
            <tr>
                <td class="footer">
                    <p>&copy; 2026 YSStore Logistics. All rights reserved.</p>
                </td>
            </tr>
        </table>
    </div>
</body>
</html>
`;

// --- 2. The Full Controller ---
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
        subtotal,
        ids,
        delivery = {} 
    } = req.body;
   // 1. Fetch all products in the 'ids' array from the database
    // Use $in to find multiple documents by an array of IDs
   const [regularProducts, dealProducts] = await Promise.all([
  EcomerceProducts.find({ _id: { $in: ids } }).lean().exec(),
  Deals.find({ _id: { $in: ids } }).lean().exec() // <--- Changed from 'Deals' to 'DealProduct'
]);

// 2. Combine results
const foundProducts = [...regularProducts, ...dealProducts];

    
    
    // console.log(foundProducts)
    // 2. Validate quantities
    for (const item of items) {
        // Find the matching product from our database results
        const dbProduct = foundProducts.find(
            (p) => p._id.toString() === item.productId.toString()
        );
        if (!dbProduct) {
            return res.status(404).json({ 
                message: `Product with ID ${item.productId} not found.` 
            });
        }

        // Check if requested quantity exceeds available stock
        // Note: Change 'Quantity' to whatever your field name is (e.g., 'stock')
        if (item.quantity > dbProduct.quantity||item.quantity >dbProduct.unitsLeft) {
            return res.status(400).json({ 
                message: `Stock mismatch: ${dbProduct.name} only has ${dbProduct.quantity||dbProduct.unitsLeft} items left.` 
            });
        }
    }
    // --- 1. Basic Validations ---
    if (!Username) return res.status(400).json({ success: false, message: 'Username is required' });
    if (!Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ success: false, message: 'Order must contain items' });
    }

    const user = await User.findOne({ Username }).populate('UserProfileId').exec()||  await Admin.findOne({ Username }).populate('UserProfileId').exec()||await CompanyUser.findOne({ Username }).populate('UserProfileId').exec();
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    // --- 2. Group Items by Vendor ---
    // Items from the SAME company AND branch are grouped together in ONE order
    const vendorGroups = {};
    items.forEach((it, index) => {
        const cId = Array.isArray(companyId) ? companyId[index] : companyId;
        const bId = Array.isArray(branchId) ? branchId[index] : branchId;
        
        // Only group by company + branch (no index) - same company/branch = same order
        const groupKey = `${cId}_${bId}`;

        if (!vendorGroups[groupKey]) {
            vendorGroups[groupKey] = {
                companyId: cId,
                branchId: bId,
                items: [],
                subtotal: 0
            };
        }

        const price = Number(it.soldAtPrice) || 0;
        const quantity = Number(it.quantity || it.qty||dbProduct.unitsLeft) || 0;
        console.log(price)
        vendorGroups[groupKey].items.push({
            productId: it.productId || null,
            ProductName: it.ProductName || '',
            ProductImg: Array.isArray(it.ProductImg) ? it.ProductImg : [it.ProductImg],
            Price: price,
            quantity,
            paymentReference:paymentReference+"_"+Math.floor(Math.random()*1000).toString(36), // Append random number to ensure uniqueness
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
    let totalAdminCommission = 0;
    let totalPartnerCommission = 0;

    const numberOfVendors = Object.keys(vendorGroups).length; // Now represents number of individual Orders

    const transporter = nodemailer.createTransport({
        service: 'gmail', 
        auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS }
    });

    const sendYSStoreMail = async (to, subject, htmlContent) => {
        try {
            await transporter.sendMail({
             from: `"YSStore Logistics" <${process.env.EMAIL_USER}>`,
                to,
                subject,
                html: emailWrapper(htmlContent, subject),
                attachments: [{
                    filename: 'YSStore.png',
                    path: 'https://api.ysstoreapp.com/img/ys.png', // Ensure this is a valid local path or URL
                    cid: 'ysstorelogo'
                }]
            });
        } catch (err) {
        }

    for (const key in vendorGroups) {
        const group = vendorGroups[key];

        // --- Inside the "for (const key in vendorGroups)" loop ---

        let targetAdmin = null;
        let sellerName = "";

// 1. Identify the Admin
if (group.branchId && group.branchId !== "null") {
    // If it's a branch, find the Company first to get the ID needed for the Admin lookup
    const companyWithBranch = await Company.findOne({ BranchId: group.branchId }).lean();
    if (companyWithBranch) {
        // Use the ownerId or the companyId to find the Admin
        targetAdmin = await Admin.findById(companyWithBranch.ownerId).populate("UserProfileId");
        sellerName = `${companyWithBranch.CompanyName} (Branch)`;
    }
} else {
    // Direct Company lookup: Find Admin using the companyId provided in the request
    targetAdmin = await Admin.findById(group.companyId).populate("UserProfileId");
    
    // We also fetch the company name for the email branding
    const comp = await Company.findById(group.companyId).lean();
    sellerName = comp?.CompanyName || "Your Store";
}

// 2. Send the Mail to the Found Admin
if (targetAdmin && targetAdmin.Email) {
    const ownerEmail = targetAdmin.Email;
    const ownerName = targetAdmin.Username || "Admin";

    const shopOwnerMailContent = `
        <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: auto; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden;">
            <div style="background-color: #2563eb; color: #ffffff; padding: 30px; text-align: center;">
                <p style="text-transform: uppercase; font-size: 11px; letter-spacing: 2px; margin: 0 0 10px 0; opacity: 0.8;">New Order Notification</p>
                <h1 style="margin: 0; font-size: 24px;">Order Received for ${sellerName}</h1>
            </div>

            <div style="padding: 30px;">
                <p style="font-size: 16px; color: #1e293b;">Hello <strong>${ownerName}</strong>,</p>
                <p style="color: #64748b;">A customer (<strong>${Username}</strong>) has placed a new order. Here is the breakdown:</p>

                <table style="width: 100%; border-collapse: collapse; margin-top: 25px;">
                    <thead>
                        <tr style="border-bottom: 2px solid #f1f5f9; text-align: left; color: #94a3b8; font-size: 12px;">
                            <th style="padding-bottom: 10px;">PRODUCT</th>
                            <th style="padding-bottom: 10px; text-align: center;">QTY</th>
                            <th style="padding-bottom: 10px; text-align: right;">PRICE</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${group.items.map(it => `
                            <tr style="border-bottom: 1px solid #f8fafc;">
                                <td style="padding: 15px 0;">
                                    <div style="font-weight: 700; color: #1e293b;">${it.ProductName}</div>
                                    <div style="font-size: 11px; color: #94a3b8;">SKU: ${it.sku || 'N/A'}</div>
                                </td>
                                <td style="padding: 15px 0; text-align: center; color: #1e293b; font-weight: 600;">${it.quantity}</td>
                                <td style="padding: 15px 0; text-align: right; color: #1e293b; font-weight: 700;">
                                    $${(it.quantity * it.Price).toFixed(2)}
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>

                <div style="margin-top: 30px; padding: 20px; background-color: #f8fafc; border-radius: 12px;">
                    <div style="display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 14px; color: #64748b;">
                        <span>Subtotal</span>
                        <span>$${group.subtotal.toFixed(2)}</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; font-size: 18px; font-weight: 900; color: #2563eb; margin-top: 10px; border-top: 1px solid #e2e8f0; padding-top: 10px;">
                        <span>Net Earnings</span>
                        <span>$${group.subtotal.toFixed(2)}</span>
                    </div>
                </div>

                <div style="margin-top: 30px; text-align: center;">
                    <a href="https://ysstoreapp.com/dashboard/orders/${ownerName}.YsStore/${orderForVendor._id}" 
                       style="display: inline-block; background-color: #1e293b; color: #ffffff; padding: 14px 28px; border-radius: 10px; text-decoration: none; font-weight: 700; font-size: 14px;">
                        View Order Dashboard
                    </a>
                </div>
            </div>

            <div style="background-color: #f1f5f9; padding: 20px; text-align: center; font-size: 11px; color: #94a3b8; border-top: 1px solid #e2e8f0;">
                Order ID: /${orderForVendor.orderId} | Reference: ${paymentReference}
            </div>
        </div>
    `;

    await sendYSStoreMail(ownerEmail, `New Order Received - ${sellerName}`, shopOwnerMailContent);
}
      
// --- Inside the "for (const key in vendorGroups)" loop ---

// 1. Determine Identity (Branch vs Company)
let recipientEmail;
let displayName;
let identityType;

if (group.branchId && group.branchId !== "null") {
    const targetBranch = await Branch.findById(group.branchId);
    recipientEmail = targetBranch?.Email;
    displayName = targetBranch?.BranchName || "Branch Manager";
    identityType = "Branch";
} else {
    const targetCompany = await Company.findById(group.companyId).populate('CompanyUsers');
    recipientEmail = targetCompany?.Email;
    displayName = targetCompany?.CompanyName || "Company Admin";
    identityType = "Company";
}

// 2. Send the Mail
if (recipientEmail) {
    const vendorMailContent = `
        <div style="font-family: sans-serif; border: 1px solid #e2e8f0; padding: 20px; border-radius: 16px;">
            <h2 style="color: #1e293b;">New Order for ${displayName} (${identityType})</h2>
            <p>Order ID: <strong>#${orderForVendor.orderId}</strong></p>
            <hr style="border: 0; border-top: 1px solid #f1f5f9;" />
            
            <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
                <thead>
                    <tr style="text-align: left; color: #64748b; font-size: 12px; text-transform: uppercase;">
                        <th style="padding-bottom: 10px;">Item</th>
                        <th style="padding-bottom: 10px;">Qty</th>
                        <th style="padding-bottom: 10px;">Price</th>
                        <th style="padding-bottom: 10px; text-align: right;">Total</th>
                    </tr>
                </thead>
                <tbody>
                    ${group.items.map(it => `
                        <tr style="border-bottom: 1px solid #f8fafc;">
                            <td style="padding: 12px 0; font-weight: bold; color: #334155;">${it.ProductName}</td>
                            <td style="padding: 12px 0;">${it.quantity}</td>
                            <td style="padding: 12px 0;">$${it.Price.toFixed(2)}</td>
                            <td style="padding: 12px 0; text-align: right; font-weight: bold;">$${(it.quantity * it.Price).toFixed(2)}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>

            <div style="text-align: right; background: #f8fafc; padding: 15px; border-radius: 8px;">
                <p style="margin: 0; color: #64748b;">Subtotal: <strong>$${group.subtotal.toFixed(2)}</strong></p>
                <p style="margin: 5px 0 0 0; color: #2563eb; font-size: 18px;">Total to Process: <strong>$${(group.subtotal + groupShipping + groupTax).toFixed(2)}</strong></p>
            </div>
        </div>
    `;
    await sendYSStoreMail(recipientEmail, `New ${identityType} Order: ${orderForVendor.orderId}`, vendorMailContent);
}
        // Calculate split tax/shipping for this specific order item
        const groupTax = tax / numberOfVendors;
        const groupShipping = shippingCost / numberOfVendors;

        const orderForVendor = await Order.create({
            orderId: generateOrderId(),
            Username,
            Customer,
            paymentReference:paymentReference+"_"+Math.floor(Math.random()*1000).toString(36), // Append random number to ensure uniqueness
            
            companyId: [group.companyId],
            branchId: [group.branchId],
            items: group.items,
            subtotal: group.subtotal,
            shippingCost: groupShipping,
            tax: groupTax,
            total: group.subtotal + groupShipping + groupTax,
            delivery: {
                location: {
                    lat: delivery?.lat || delivery?.location?.lat || null,
                    lng: delivery?.lng || delivery?.location?.lng || null
                }
            }
        });

        createdOrderIds.push(orderForVendor._id);

        const salesData = group.items.map(it => ({
            name: it.ProductName,
            soldAtPrice: it.Price,
            actualPrice: it.actualPrice || 0,
            quantity: it.quantity,
            TransactionType: 'Order',
            companyId: group.companyId,
            branchId: group.branchId,
            date: new Date(),
            paymentReference:paymentReference
            // +"_"+Math.floor(Math.random()*1000).toString(36)||it.paymentReference, // Append random number to ensure uniqueness
            // paymentReference: paymentReference || it.paymentReference
        }));

        const createdSales = await Sale.insertMany(salesData);

        // --- UPDATED COMMISSION LOGIC ---
        // 20% of Tax to Partner, 80% of Tax to Admin
        // We add tax to the subtotal to create the "Commission Pool"
        const commissionPool = group.subtotal + groupTax; 
        
        const partnerShare = tax * 0.20; // NOTE: This calculates share of TOTAL tax. Should be groupTax? 
        // Logic correction: The original code used global 'tax'. If we split orders, we should probably aggregate or use groupTax.
        // However, to maintain original logic flow: 
        // Since we are iterating loop N times, we must use groupTax to avoid multiplying commission N times.
        const itemPartnerShare = tax * 0.20;
        const itemSuperAdminShare = tax * 0.80;
        
        totalAdminCommission += itemSuperAdminShare;
        totalPartnerCommission += itemPartnerShare;

        // Update Wallets
        updatePromises.push(Admin.updateMany({ Role: "Partner" }, { $push: { walletBalance: itemPartnerShare } }));
        updatePromises.push(Admin.updateMany({ Role: "SuperAdmin" }, { $push: { walletBalance: itemSuperAdminShare } }));

        if (group.companyId && group.companyId !== "null") {
            updatePromises.push(Company.findByIdAndUpdate(group.companyId, {
                $push: { 
                    Orders: orderForVendor._id, 
                    SaleId: { $each: createdSales.map(s => s._id) } 
                }
            }));
        }

        if (group.branchId && group.branchId !== "null") {
            updatePromises.push(Branch.findByIdAndUpdate(group.branchId, {
                $push: { 
                    Orders: orderForVendor._id, 
                    SaleId: { $each: createdSales.map(s => s._id) } 
                }
            }));
        }
    }

    // --- 1. Pre-fetch Names for the Summary ---
// This ensures the Admin email has the actual names of companies/branches
const summaryDetails = await Promise.all(
    Object.keys(vendorGroups).map(async (key) => {
        const group = vendorGroups[key];
        let displayName = "Unknown Vendor";
        let type = "Company";

        if (group.branchId && group.branchId !== "null") {
            const b = await Branch.findById(group.branchId).lean();
            displayName = b?.BranchName || "Unknown Branch";
            type = "Branch";
        } else {
            const c = await Company.findById(group.companyId).lean();
            displayName = c?.CompanyName || "Unknown Company";
            type = "Company";
        }

        return { ...group, displayName, type };
    })
);

// --- 2. Generate Admin Email Content ---
const adminMailContent = `
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #1e293b; max-width: 600px; margin: auto; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden;">
        <div style="background-color: #0f172a; color: #ffffff; padding: 24px; text-align: center;">
            <h2 style="margin: 0; font-size: 20px;">Global Transaction Summary</h2>
            <p style="margin: 4px 0 0; opacity: 0.8; font-size: 14px;">Ref: ${paymentReference}</p>
        </div>

        <div style="padding: 24px;">
            <p style="font-size: 14px; margin-bottom: 20px;">
                Customer: <strong style="color: #0f172a;">${Username}</strong><br/>
                Total Vendors Involved: <strong>${summaryDetails.length}</strong>
            </p>

            <h4 style="font-size: 12px; text-transform: uppercase; color: #64748b; letter-spacing: 0.05em; margin-bottom: 12px;">Breakdown by Vendor</h4>
            
            ${summaryDetails.map(vendor => `
                <div style="background-color: #f8fafc; border: 1px solid #f1f5f9; border-radius: 8px; padding: 16px; margin-bottom: 16px;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; border-bottom: 1px dashed #cbd5e1; padding-bottom: 8px;">
                        <span style="font-weight: 800; font-size: 14px; color: #334155;">${vendor.type}: ${vendor.displayName}</span>
                        <span style="font-weight: 800; color: #2563eb;">$${vendor.subtotal.toFixed(2)}</span>
                    </div>
                    <table style="width: 100%; font-size: 13px; border-spacing: 0;">
                        ${vendor.items.map(it => `
                            <tr>
                                <td style="padding: 4px 0; color: #475569;">${it.ProductName}</td>
                                <td style="padding: 4px 0; text-align: right; color: #94a3b8;">
                                    ${it.quantity} x $${it.Price.toFixed(2)} = <strong>$${(it.quantity * it.Price).toFixed(2)}</strong>
                                </td>
                            </tr>
                        `).join('')}
                    </table>
                </div>
            `).join('')}

            <div style="margin-top: 32px; background: #f0f9ff; padding: 20px; border-radius: 12px; border: 1px solid #bae6fd;">
                <table style="width: 100%; border-collapse: collapse; font-size: 15px;">
                    <tr>
                        <td style="padding: 8px 0; color: #0369a1;">Gross Platform Sales:</td>
                        <td style="padding: 8px 0; text-align: right; font-weight: 900;">$${subtotal.toFixed(2)}</td>
                    </tr>
                    <tr style="border-top: 1px solid #e0f2fe;">
                        <td style="padding: 8px 0; color: #166534;">Admin Revenue (80% Tax):</td>
                        <td style="padding: 8px 0; text-align: right; color: #16a34a; font-weight: bold;">+$${totalAdminCommission.toFixed(2)}</td>
                    </tr>
                    <tr>
                        <td style="padding: 8px 0; color: #166534;">Partner Revenue (20% Tax):</td>
                        <td style="padding: 8px 0; text-align: right; color: #16a34a; font-weight: bold;">+$${totalPartnerCommission.toFixed(2)}</td>
                    </tr>
                </table>
            </div>
        </div>
        
        <div style="background-color: #f1f5f9; padding: 16px; text-align: center; font-size: 12px; color: #94a3b8;">
            This is an automated system notification for YSStore SuperAdmins.
        </div>
    </div>
`;

await sendYSStoreMail(process.env.ADMIN_EMAIL, `💰 Order Summary - ${Username}`, adminMailContent);

    if (user.UserProfileId) {
        updatePromises.push(UserProfile.findByIdAndUpdate(user.UserProfileId, {
            $push: { orders: { $each: createdOrderIds } }
        }));
    }

    await Promise.all(updatePromises);

    // --- 4. Nodemailer Implementation ---
    
    };

    // Calculate Final Total Displayed to Customer
    // Since totalAdminCommission and totalPartnerCommission ALREADY include the tax,
    // we only need to add shippingCost. Do NOT add 'tax' again here or it will be double counted.
    const totalOrderAmount = totalAdminCommission + totalPartnerCommission + shippingCost;

    // 1. To Customer
    await sendYSStoreMail(user.UserProfileId?.Email || Customer.email, "Your Order is Confirmed!", `
        <p>Hello <strong>${Username}</strong>,</p>
        <p>Your order has been placed successfully. Thank you for choosing YSStore.</p>
        <div class="highlight-box">
            <div class="label">Order Reference</div>
            <div style="font-size: 16px; font-weight: bold; margin-bottom: 15px;">${paymentReference}</div>
            
            <div class="label">Total Paid</div>
            <span class="amount">₦${subtotal.toLocaleString()}</span>
        </div>
        <p style="text-align: center;">We are currently processing your items and will notify you once they are on their way.</p>
    `);

    // 2. To Partners
    const partnerUsers = await Admin.find({ Role: "Partner" }).populate("UserProfileId");
    const partnerEmails = partnerUsers.map(res => res.UserProfileId?.Email).filter(e => e); // Filter out nulls
    
    if (partnerEmails.length > 0) {
        await sendYSStoreMail(partnerEmails, "New Commission Earned!", `
            <p style="text-align:center;">A new checkout has been completed on the platform.</p>
            <div class="highlight-box">
                <div class="label">Your Earnings (20%)</div>
                <span class="amount">₦${totalPartnerCommission.toLocaleString()}</span>
                <p style="margin:10px 0 0 0; font-size:12px; color:#64748b;">Includes 20% of Order Tax</p>
                <p style="margin:5px 0 0 0; font-size:12px; color:#64748b;">Ref: ${paymentReference}</p>
            </div>
            <p style="text-align:center;">Your wallet has been credited successfully.</p>
        `);
    }

    // 3. To SuperAdmins
    const adminUsers = await Admin.find({ Role: "SuperAdmin" }).populate("UserProfileId");
    const adminEmails = adminUsers.map(res => res.UserProfileId?.Email).filter(e => e);
    
    if (adminEmails.length > 0) {
        await sendYSStoreMail(adminEmails.join(','), "Revenue Alert: New Order", `
            <p style="text-align:center;">Transaction successful. The system revenue has been updated.</p>
            <div class="highlight-box">
                <div class="label">Admin Share (80%)</div>
                <span class="amount">₦${totalAdminCommission.toLocaleString()}</span>
                <p style="margin:10px 0 0 0; font-size:12px; color:#64748b;">Customer: ${Username}</p>
                <p style="margin:5px 0 0 0; font-size:12px; color:#64748b;">Ref: ${paymentReference}</p>
            </div>
        `);
    }

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
    })||await Admin.findById(id).populate({
        path: 'UserProfileId',
        populate: { path: 'orders', model: 'Order' }
    })||await CompanyUser.findById(id).populate({
        path: 'UserProfileId',
        populate: { path: 'orders', model: 'Order' }
    })
    if (!UsesOrders) return res.status(404).json({ success: false, message: 'No order to display' });

    const finalOrders = UsesOrders.UserProfileId.orders.map(res=>{
        return {
            id:res?._id,
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
    // FIX: Only update the main 'status' (like Shipped/Delivered) if the order ID matches the request ID
    // This allows granular shipping updates.
    if (status && order._id.toString() === id.toString()) {
        order.status = status;
    }
    
    // Payment status should usually sync across the whole transaction group
    if (paymentStatus) order.paymentStatus = paymentStatus;
    
    await order.save();

    // 4️⃣ Credit Wallets ONLY for the owners of THIS specific sub-order
    if (isBecomingPaid) {
      const amountToCredit = order.total-order.tax || 0;

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