const asyncHandler = require('express-async-handler');
const SaleTransaction = require('../Models/SaleShema');
const Company = require("../Models/Company");
const Branch = require("../Models/Branch");

/**
 * 🟢 GET HIERARCHICAL SALES WITH PAGINATION
 */
const GetFilteredSales = asyncHandler(async (req, res) => {
    const { Role, branchId } = req.user; 
    const { companyId } = req.query;

    // 1. Pagination Setup
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 5;
    const skip = (page - 1) * limit;

    let resultData = {};

    // 2. LOGIC FOR ADMIN / MANAGER (Company + Branch Sales)
    if (Role === 'Admin' || Role === 'manager') {
        if (!companyId) {
            return res.status(400).json({ success: false, message: "Company ID is required" });
        }

        resultData = await Company.findById(companyId)
            .populate({
                path: 'SaleId',
                options: { 
                    sort: { saleDate: -1 },
                    limit: limit, // Only fetch X sales
                    skip: skip    // Skip for pagination
                }
            })
            .populate({
                path: 'BranchId',
                populate: {
                    path: 'SaleId',
                    model: 'Sale',
                    options: { 
                        sort: { saleDate: -1 },
                        limit: limit, // Only fetch X sales per branch
                        skip: skip 
                    }
                }
            })
            .lean()||await Branch.findById(companyId)
            .populate({
                path: 'SaleId',
                options: { 
                    sort: { saleDate: -1 },
                    limit: limit,
                    skip: skip
                }
            })
            .lean();

        if (!resultData) {
            return res.status(404).json({ success: false, message: "Company not found" });
        }
    } 
    
    // 3. LOGIC FOR BRANCH USER (Single Branch View)
    else {
        resultData = await Branch.findById(companyId)
            .populate({
                path: 'SaleId',
                options: { 
                    sort: { saleDate: -1 },
                    limit: limit,
                    skip: skip
                }
            })
            .lean();
        if (!resultData) {
            return res.status(404).json({ success: false, message: "Branch not found" });
        }
    }

    // 4. Return structured data with pagination metadata
    res.status(200).json({
        success: true,
        Role: Role,
        pagination: {
            currentPage: page,
            limit: limit
        },
        data: resultData
    });
});

module.exports = GetFilteredSales;