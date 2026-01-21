const Company = require('../Models/Company');
const { checkSubscriptionStatus } = require('../utils/subscriptionCheck');

/**
 * Middleware to check if company can create branches
 * Must be called after populating company from DB
 */
const checkBranchLimit = async (req, res, next) => {
  try {
    const { targetCompanyId } = req.body;

    if (!targetCompanyId) {
      return res.status(400).json({ message: 'targetCompanyId is required' });
    }

    const company = await Company.findById(targetCompanyId);
    if (!company) {
      return res.status(404).json({ message: 'Company not found' });
    }

    // Check subscription status
    const subStatus = checkSubscriptionStatus(company);
    if (!subStatus.isValid) {
      return res.status(403).json({
        message: 'Cannot create branch: ' + subStatus.message,
        subscriptionStatus: subStatus.status
      });
    }

    // Check branch limit
    if (company.branchesCreated >= company.maxBranches) {
      return res.status(403).json({
        message: `Branch limit reached. You have created ${company.branchesCreated} out of ${company.maxBranches} allowed branches for your ${company.subscriptionPlan} plan.`,
        branchesCreated: company.branchesCreated,
        maxBranches: company.maxBranches,
        subscriptionPlan: company.subscriptionPlan,
        upgrade: 'Please upgrade your subscription plan to create more branches'
      });
    }

    // Attach company to request for use in controller
    req.company = company;
    next();
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/**
 * Middleware to check if company can create users
 */
const checkUserLimit = async (req, res, next) => {
  try {
    const { targetId } = req.body;

    if (!targetId) {
      return res.status(400).json({ message: 'targetId is required' });
    }

    // Find company - could be from Company or Branch
    let company = await Company.findById(targetId);
    
    if (!company) {
      // Try to find from branch
      const Branch = require('../Models/Branch');
      const branch = await Branch.findById(targetId);
      
      if (branch) {
        // Get company from branch
        company = await Company.findOne({
          BranchId: { $in: [targetId] }
        });
      }
    }

    if (!company) {
      return res.status(404).json({ message: 'Company not found for this target' });
    }

    // Check subscription status
    const subStatus = checkSubscriptionStatus(company);
    if (!subStatus.isValid) {
      return res.status(403).json({
        message: 'Cannot create user: ' + subStatus.message,
        subscriptionStatus: subStatus.status
      });
    }

    // Check user limit
    if (company.usersCreated >= company.maxUsers) {
      return res.status(403).json({
        message: `User limit reached. You have created ${company.usersCreated} out of ${company.maxUsers} allowed users for your ${company.subscriptionPlan} plan.`,
        usersCreated: company.usersCreated,
        maxUsers: company.maxUsers,
        subscriptionPlan: company.subscriptionPlan,
        upgrade: 'Please upgrade your subscription plan to create more users'
      });
    }

    // Attach company to request
    req.company = company;
    next();
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = {
  checkBranchLimit,
  checkUserLimit,
};
