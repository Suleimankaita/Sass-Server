const asyncHandler = require('express-async-handler');

const Branch = require('../Models/Branch');
const AdminOwner = require('../Models/AdminOwner');
const Company = require('../Models/Company');
const UserLog = require('../Models/UserLog');
const Settings = require('../Models/CompanySetting');

const CreateBranch = asyncHandler(async (req, res) => {
  const {
    CompanyName,
    lat,
    long,
    street,
    postalNumber,
    CompanyPassword,
    id, // Admin ID
    CompanyEmail,
    targetCompanyId,
  } = req.body;

  // 🔴 Basic validation
  if (!CompanyName || !id || !targetCompanyId) {
    return res.status(400).json({ message: 'Missing required fields' });
  }

  // 1️⃣ Find Admin
  const foundAdmin = await AdminOwner.findById(id);
  if (!foundAdmin) {
    return res.status(401).json({ message: 'Admin not found' });
  }

  // 2️⃣ Verify admin → company ownership
  if (
    !foundAdmin.companyId ||
    foundAdmin.companyId.toString() !== targetCompanyId
  ) {
    return res.status(403).json({
      message: 'Unauthorized: Company does not belong to this admin',
    });
  }

  // 3️⃣ Find Company
  const targetCompany = await Company.findById(targetCompanyId).populate('BranchId');
  if (!targetCompany) {
    return res.status(404).json({ message: 'Company not found' });
  }

  // 4️⃣ Subscription / branch limit check
  if (targetCompany.branchesCreated >= targetCompany.maxBranches) {
    return res.status(403).json({
      message: 'Branch limit reached for your current subscription',
      branchesCreated: targetCompany.branchesCreated,
      maxBranches: targetCompany.maxBranches,
      upgrade: 'Upgrade your subscription to add more branches',
    });
  }

  // 5️⃣ Duplicate branch name (company-scoped)
  const isDuplicate = Array.isArray(targetCompany.BranchId)
    && targetCompany.BranchId.some(
      (branch) =>
        branch.CompanyName &&
        branch.CompanyName.toLowerCase() === CompanyName.toLowerCase()
    );

  if (isDuplicate) {
    return res.status(409).json({
      message: 'Branch name already exists under this company',
    });
  }

  // 6️⃣ Create Branch
  const newBranch = await Branch.create({
    CompanyName,
    CompanyEmail,
    CompanyPassword, // stored as plain text per your instruction
    companyId: targetCompany._id,
    Address: {
      StreetName: street,
      PostalNumber: postalNumber,
      Lat: lat,
      Long: long,
    },
  });

  // 7️⃣ Create Branch Settings
  await Settings.create({
    businessName: CompanyName,
    address: street,
    companyId: newBranch._id,
  });

  // 8️⃣ Link Branch to Company
  targetCompany.BranchId.push(newBranch._id);
  targetCompany.branchesCreated += 1;
  await targetCompany.save();

  // 9️⃣ Logging
  const log = await UserLog.create({
    action: 'CREATE_BRANCH',
    details: `Branch "${CompanyName}" created under company "${targetCompany.CompanyName}"`,
    Username: foundAdmin.Username,
  });

  // Ensure UserLogId exists
  if (!Array.isArray(foundAdmin.UserLogId)) {
    foundAdmin.UserLogId = [];
  }

  foundAdmin.UserLogId.push(log._id);
  await foundAdmin.save();

  // ✅ Response
  res.status(201).json({
    success: true,
    message: `Branch "${CompanyName}" successfully created`,
    branchId: newBranch._id,
    branchesCreated: targetCompany.branchesCreated,
    maxBranches: targetCompany.maxBranches,
  });
});

module.exports = CreateBranch;
