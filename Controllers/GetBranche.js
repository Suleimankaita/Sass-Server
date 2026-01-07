const AdminBranch = require('../Models/AdminOwner');
const asyncHandler = require('express-async-handler');

const GetAdminBranches = asyncHandler(async (req, res) => {
  // 1. Validate userId early
  if (!req.userId) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  const admin = await AdminBranch.findById(req.userId)
    .populate({
      path: 'companyId',
      populate: {
        path: 'BranchId',
        model: 'Branch'
      }
    });

  if (!admin) {
    return res.status(404).json({ message: 'Admin account not found' });
  }

  // 2. Correct branch extraction
  const branches = admin.companyId?.BranchId || [];

  return res.status(200).json({
    count: branches.length,
    branches
  });
});

module.exports = GetAdminBranches;
