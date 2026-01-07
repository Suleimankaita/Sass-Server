const Branch = require('../Models/Branch'); // Query the Branch model directly
const Compnay = require('../Models/Company'); // Query the Branch model directly
const asyncHandler = require('express-async-handler');

const GetSingleBranch = asyncHandler(async (req, res) => {
  // 1. Get IDs from request (params or body)
  const { companyId, branchId } = req.query; 

  if (!companyId || !branchId) {
    return res.status(400).json({ 
      message: 'Both Company ID and Branch ID are required' 
    });
  }

  const foundcom=await Compnay.findById(companyId)
  if(!foundcom)return res.status(404).json({'message':'Company Not found'})
    
      if (!foundcom.BranchId.includes(branchId)) {
    return res.status(404).json({ 
      message: 'Branch not found or does not belong to this company' 
    });
  }
  // 2. Find the specific branch that matches BOTH IDs
  // We populate 'CompanyUsers' to get the full details you requested
  const branch = await Branch.findOne({ 
    _id: branchId, 
    // companyId: companyId 
  }).populate('CompanyUsers').populate('Orders').populate('SaleId').populate('TransactionId').populate('EcomerceProducts').populate('POSProductsId');
  // 3. Check if branch exists


  // 4. Return the single branch with its users
  return res.status(200).json({
    success: true,
    branch: branch,
    userDetails: branch.CompanyUsers // This contains the full details of the users
  });
});

module.exports = GetSingleBranch;