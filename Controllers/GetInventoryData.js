const mongoose = require("mongoose");

// Import all your models based on the schemas provided
const Branch = require("../Models/Branch");
const Admin = require("../Models/AdminOwner");
const Company = require("../Models/Company");
const CompanyUser = require("../Models/CompanyUsers");
const DealProduct = require("../Models/Deals");
const EcomerceProduct = require("../Models/EcomerceProducts");
const FoodPrice = require("../Models/FoodPrice");
const FoodItem = require("../Models/FoodPrice");
const POSProduct = require("../Models/POSProduct");
const PosSell = require("../Models/PosSell");
const Sale = require("../Models/SaleShema");
const Transaction = require("../Models/transactions");
const Order = require("../Models/User_order");
const User = require("../Models/User"); // Exported as YS_store_Users

// Controller to fetch EVERYTHING
exports.getAllSystemData = async (req, res) => {
  try {
    // We use Promise.all to fetch from all collections in parallel
    // This is much faster than awaiting them one by one
    const [
      branches,
      admins,
      companies,
      companyUsers,
      dealProducts,
      ecomerceProducts,
      foodPrices,
      foodItems,
      posProducts,
      posSells,
      sales,
      transactions,
      orders,
      users,
    ] = await Promise.all([
      Branch.find({}).sort({ createdAt: -1 }), // Sorting by newest first
      Admin.find({}).sort({ createdAt: -1 }),
      Company.find({}).sort({ createdAt: -1 }),
      CompanyUser.find({}).sort({ createdAt: -1 }),
      DealProduct.find({}).sort({ createdAt: -1 }),
      EcomerceProduct.find({}).sort({ createdAt: -1 }),
      FoodPrice.find({}).sort({ createdAt: -1 }),
      FoodItem.find({}).sort({ createdAt: -1 }),
      POSProduct.find({}).sort({ createdAt: -1 }),
      PosSell.find({}).sort({ createdAt: -1 }),
      Sale.find({}).sort({ createdAt: -1 }),
      Transaction.find({}).sort({ createdAt: -1 }),
      Order.find({}).sort({ createdAt: -1 }),
      User.find({}).sort({ createdAt: -1 }),
    ]);

    // Return all data in a structured JSON object
    return res.status(200).json({
      success: true,
      count: {
        branches: branches.length,
        admins: admins.length,
        companies: companies.length,
        orders: orders.length,
        // ... add other counts if needed
      },
      data: {
        branches,
        admins,
        companies,
        companyUsers,
        dealProducts,
        ecomerceProducts,
        foodPrices,
        foodItems,
        posProducts,
        posSells,
        sales,
        transactions,
        orders,
        users,
      },
    });
  } catch (error) {
    console.error("Error fetching system data:", error);
    return res.status(500).json({
      success: false,
      message: "Server Error: Unable to fetch system data",
      error: error.message,
    });
  }
};