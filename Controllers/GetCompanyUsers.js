const asyncHandler = require('express-async-handler');
const Admin = require('../Models/AdminOwner');
const Company = require('../Models/Company');
const Branch = require('../Models/Branch');
const GetStaffMembers = asyncHandler(async (req, res) => {
    const adminId = "6914f35ce9ef2f92ad2f3889"; 
    const { targetId, type } = req.query;

    if (!targetId || !type) {
        return res.status(400).json({ message: "targetId and type (company/branch) are required" });
    }

    // 1. Fetch the Admin
    const admin = await Admin.findById(adminId).select('companyId');
    
    // 🔴 THE FIX: Check if admin exists before reading .companyId
    if (!admin) {
        return res.status(404).json({ 
            success: false, 
            message: "Admin account not found. Please log in again." 
        });
    }

    let parentData;

    if (type.toLowerCase() === 'company') {
        // Now it is safe to read admin.companyId
        if (!admin.companyId.includes(targetId)) {
            return res.status(403).json({ message: "Unauthorized: You do not own this company" });
        }

        parentData = await Company.findById(targetId).populate({
            path: 'CompanyUsers',
            populate: { path: 'UserProfileId' }
        });

    } else if (type.toLowerCase() === 'branch') {
        const validParent = await Company.findOne({
            _id: { $in: admin.companyId },
            BranchId: targetId
        });

        if (!validParent) {
            return res.status(403).json({ message: "Unauthorized: Branch not found in your companies" });
        }

        parentData = await Branch.findById(targetId).populate({
            path: 'CompanyUsers',
            populate: { path: 'UserProfileId' }
        });
    }

    // Final check for the target document
    if (!parentData) {
        return res.status(404).json({ message: "Target Company or Branch not found" });
    }

    res.status(200).json({
        success: true,
        users: parentData.CompanyUsers
    });
});

module.exports = { GetStaffMembers };