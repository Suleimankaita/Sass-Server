const asyncHandler = require("express-async-handler");
const Company = require("../Models/Company");
const Branch = require("../Models/Branch");

const getCompanySubscriptionExpireDate = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (!id) {
    res.status(400);
    throw new Error("ID is required");
  }

  // 1. Find the Company OR the Branch to identify the parent Company ID
  let company = await Company.findById(id);
  let parentCompanyId = id;

  if (!company) {
    // If not a company, check if it's a branch ID
    const branch = await Branch.findById(id);
    if (!branch) {
      res.status(404);
      throw new Error("Company or Branch not found");
    }
    // If it's a branch, we need to fetch the actual company it belongs to
    parentCompanyId = branch.companyId; // Assuming your Branch model has 'companyId'
    company = await Company.findById(parentCompanyId);
  }

  if (!company) {
    res.status(404);
    throw new Error("Parent company not found");
  }

  // 2. Find all branches belonging to this company
  const branches = await Branch.find({ companyId: parentCompanyId });

  // 3. Determine the actual expire date logic
  const actualExpireDate = company.subscriptionPlan === "Free" 
    ? company.trialEndDate 
    : company.subscriptionEndDate;

  // 4. Map the branches to include the company's subscription info
  const branchesWithSubscription = branches.map(branch => ({
    _id: branch._id,
    branchName: branch.branchName,
    location: branch.location,
    // Inherit from parent
    expireDate: actualExpireDate,
    subscriptionStatus: company.subscriptionStatus,
    isSubscribed: company.isSubscribed
  }));

  res.status(200).json({
    companyInfo: {
      id: company._id,
      name: company.CompanyName,
      status: company.subscriptionStatus,
      expireDate: actualExpireDate,
      plan: company.subscriptionPlan
    },
    branches: branchesWithSubscription
  });
});

module.exports = {
  getCompanySubscriptionExpireDate,
};