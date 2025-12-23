const AdminBranch = require('../Models/AdminOwner');
const asyncHandler = require("express-async-handler");

const GetAdminBranches = asyncHandler(async (req, res) => {
  
    const adminId = req.userId;

    const admin = await AdminBranch.findById(adminId)
        .populate({
            path: 'BranchId',
            select: '-CompanyPassword' 
        })
        .lean();

    if (!admin) {
        return res.status(404).json({ message: "Admin account not found" });
    }

    const branches = admin.BranchId || [];

    res.status(200).json({
        count: branches.length,
        branches: branches
    });
});

module.exports =  GetAdminBranches ;