const asyncHandler = require('express-async-handler');
const mongoose = require('mongoose');

const SaleTransaction = require('../Models/SaleShema');
const Branch = require('../Models/Branch');
const Company = require('../Models/Company');
const Admin = require('../Models/AdminOwner');
const User = require('../Models/CompanyUsers');
const Logs = require('../Models/UserLog');
const POSProduct = require('../Models/POSProduct'); 
const EcomerceProducts = require('../Models/EcomerceProducts'); 

const ProcessSale = asyncHandler(async (req, res) => {
    // IMPORTANT: It is highly recommended to use a session/transaction here 
    // to prevent stock being deducted if the Sale record fails to create.

    try {
        const {
            sellerId,
            actorId,
            productId,
            quantity,
            soldAtPrice,
            actualPrice,
            paymentMethod,
            img,
            TransactionType
        } = req.body;
        console.log(req.body)

        if (!img||!sellerId || !actorId || !productId || !quantity || !soldAtPrice||!TransactionType) {
            return res.status(400).json({ message: "Missing required sale data." });
        }

        /* 1. IDENTIFY SELLER & ACTOR */
        let seller = await Branch.findById(sellerId) || await Company.findById(sellerId);
        let sellerType = (await Branch.exists({ _id: sellerId })) ? 'Branch' : 'Company';
        console.log(sellerType)
        let actor = await Admin.findById(actorId).populate('UserProfileId') || await User.findById(actorId).populate('UserProfileId');
        let actorType = (await Admin.exists({ _id: actorId })) ? 'Admin' : 'User';

        
        if (!seller || !actor) {
            return res.status(404).json({ message: "Seller or Authorized User not found." });
        }

        /* 2. PRODUCT & STOCK CHECK */
        const posProduct = await POSProduct.findById(productId);
        const ecoProduct = await EcomerceProducts.findById(productId);

        if (!posProduct && !ecoProduct) {
            return res.status(404).json({ message: "Product not found in POS or Ecommerce." });
        }

        // Logic: Check quantity against whichever exists. 
        // If both exist, we check if the primary one (POS) has enough.
        const availableStock = posProduct ? posProduct.quantity : ecoProduct.quantity;

        if (availableStock < quantity) {
            return res.status(400).json({
                message: `Insufficient stock. Available: ${availableStock}, Requested: ${quantity}`
            });
        }

        /* 3. UPDATE STOCK (Update All) */
        if (posProduct) {
            posProduct.quantity -= quantity;
            await posProduct.save();
        }

        if (ecoProduct) {
            ecoProduct.quantity -= quantity;
            await ecoProduct.save();
        }

        const productData = posProduct || ecoProduct;
        const totalAmount = soldAtPrice * quantity;

        /* 4. CREATE SALE RECORD */
        // Removed [0] logic here:
        const newSale = await SaleTransaction.create({
            sellerId: seller._id,
            sellerModel: sellerType,
            img,
            TransactionType,
            actorDetails: {
                id: actor._id,
                name: actor.Firstname || actor.Username || actor.CompanyName || 'Unknown',
                role: actorType
            },
            // Assuming your schema expects these fields directly or in an items array:
            // items: [{
                productId: productData._id,
                name: productData.name,
                normalPrice: productData.price,
                actualPrice:productData?.actualPrice,
                quantity: quantity,
                soldAtPrice,
            // }],
            totalAmount,
            paymentMethod,
            saleDate: new Date()
        });

        /* 5. LINK SALE & LOGS */
        if (sellerType === 'Branch') {
            seller.SaleId.push(newSale._id); // Changed from newSale[0]
            actor?.UserProfileId.SaleId.push(newSale._id); // Changed from newSale[0]
            await seller.save();
        }else if (sellerType === 'Company'){
            seller.SaleId.push(newSale._id); // Changed from newSale[0]
            actor?.UserProfileId.SaleId.push(newSale._id); // Changed from newSale[0]

        }

        if(actorType==="User"){
         actor.UserProfileId.SaleId.push(newSale._id)   
        }

        await Logs.create({
            actorId: actor._id,
            actorRole: actorType,
            action: 'SALE_COMPLETED',
            metadata: { 
                saleId: newSale._id, // Changed from newSale[0]
                total: totalAmount 
            }
        });
        await seller.save()
        await actor?.UserProfileId?.save()
        res.status(201).json({
            success: true,
            message: "Sale processed and stock updated across platforms.",
            sale: newSale // Changed from newSale[0]
        });

    } catch (error) {
        console.error("Sale Error:", error);
        res.status(500).json({ message: error.message });
    }
});

module.exports = ProcessSale;