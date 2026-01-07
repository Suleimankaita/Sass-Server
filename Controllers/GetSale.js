const asyncHandler = require('express-async-handler');
const SaleTransaction = require('../Models/SaleShema');
const Company = require("../Models/Company");
const Branch = require("../Models/Branch");

/**
 * 🟢 GET HIERARCHICAL SALES
 * Deep populates: Company -> Company Sales
 * Deep populates: Company -> Branches -> Branch Sales
 */
const GetFilteredSales = asyncHandler(async (req, res) => {
    // 1. Extract user info from Auth Middleware
    const { Role, branchId } = req.user; 
    const { companyId } = req.query; // Admin passes the companyId they want to view

    let resultData = {};

    // 2. LOGIC FOR ADMIN / MANAGER (The "Deep" Search)
    if (Role === 'Admin' || Role === 'Manager') {
        if (!companyId) {
            return res.status(400).json({ success: false, message: "Company ID is required for Admins" });
        }

        // FIND COMPANY AND GO DEEP
        resultData = await Company.findById(companyId)
            .populate({
                path: 'SaleId', // Level 1: Sales belonging directly to the Main Office/Company
                options: { sort: { saleDate: -1 } }
            })
            .populate({
                path: 'BranchId', // Level 1: Find all branches
                populate: {
                    path: 'SaleId', // Level 2: "Go Deep" to find sales belonging to each branch
                    model: 'Sale',
                    options: { sort: { saleDate: -1 } }
                }
            })
            .lean();


        if (!resultData) {
            return res.status(404).json({ success: false, message: "Company not found" });
        }
    } 
    
    // 3. LOGIC FOR BRANCH USER (Limited View)
    else {
        // If it's a branch user, we only "go deep" into their specific branch
        resultData = await Branch.findById(branchId)
            .populate({
                path: 'SaleId',
                options: { sort: { saleDate: -1 } }
            })
            .lean();
            
        if (!resultData) {
            return res.status(404).json({ success: false, message: "Branch not found" });
        }
    }

    // 4. Return the structured data
    res.status(200).json({
        success: true,
        Role: Role,
        data: resultData
    });
});

module.exports = GetFilteredSales;