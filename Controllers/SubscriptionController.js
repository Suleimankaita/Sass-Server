const asynchandler = require('express-async-handler');
const Company = require('../Models/Company');
const { checkSubscriptionStatus } = require('../utils/subscriptionCheck');

/**
 * Plan Limits Configuration
 */
const PLAN_LIMITS = {
  Free: { maxBranches: 1, maxUsers: 5 },
  Basic: { maxBranches: 5, maxUsers: 10 },
  Pro: { maxBranches: 999999, maxUsers: 999999 }, // Unlimited
  Enterprise: { maxBranches: 999999, maxUsers: 999999 }, // Unlimited
};

/**
 * Get subscription status of a company
 */
const getSubscriptionStatus = asynchandler(async (req, res) => {
  try {
    const { companyId } = req.params;

    const company = await Company.findById(companyId);
    if (!company) {
      return res.status(404).json({ message: 'Company not found' });
    }

    const status = checkSubscriptionStatus(company);
    
    return res.status(200).json({
      subscriptionStatus: status,
      company: {
        _id: company._id,
        CompanyName: company.CompanyName,
        trialEndDate: company.trialEndDate,
        isSubscribed: company.isSubscribed,
        subscriptionEndDate: company.subscriptionEndDate,
        subscriptionPlan: company.subscriptionPlan,
        branchesCreated: company.branchesCreated,
        maxBranches: company.maxBranches,
        usersCreated: company.usersCreated,
        maxUsers: company.maxUsers,
      }
    });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
});

/**
 * Subscribe/Upgrade company subscription after payment
 */
const subscribeCompany = asynchandler(async (req, res) => {
  try {
    const { companyId } = req.params;
    const { subscriptionPlan, durationMonths, paymentDetails } = req.body;

    if (!subscriptionPlan || !durationMonths) {
      return res.status(400).json({
        message: 'subscriptionPlan and durationMonths are required'
      });
    }

    if (!PLAN_LIMITS[subscriptionPlan]) {
      return res.status(400).json({
        message: 'Invalid subscription plan'
      });
    }

    const company = await Company.findById(companyId);
    if (!company) {
      return res.status(404).json({ message: 'Company not found' });
    }

    // Calculate subscription end date
    const subscriptionEndDate = new Date();
    subscriptionEndDate.setMonth(subscriptionEndDate.getMonth() + parseInt(durationMonths));

    console.log(subscriptionEndDate)
    // Get plan limits
    const planLimits = PLAN_LIMITS[subscriptionPlan];

    // Update company subscription
    company.isSubscribed = true;
    company.subscriptionStatus = 'active';
    company.subscriptionPlan = subscriptionPlan;
    company.subscriptionEndDate = subscriptionEndDate;
    company.maxBranches = planLimits.maxBranches;
    company.maxUsers = planLimits.maxUsers;

    await company.save();

    return res.status(200).json({
      message: 'Subscription activated successfully',
      company: {
        _id: company._id,
        CompanyName: company.CompanyName,
        subscriptionPlan: company.subscriptionPlan,
        subscriptionEndDate: company.subscriptionEndDate,
        isSubscribed: company.isSubscribed,
        maxBranches: company.maxBranches,
        maxUsers: company.maxUsers,
      }
    });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
});

/**
 * Renew subscription for an already subscribed company
 */
const renewSubscription = asynchandler(async (req, res) => {
  try {
    const { companyId } = req.params;
    const { durationMonths } = req.body;

    if (!durationMonths) {
      return res.status(400).json({ message: 'durationMonths is required' });
    }

    const company = await Company.findById(companyId);
    if (!company) {
      return res.status(404).json({ message: 'Company not found' });
    }

    // Calculate new subscription end date
    const newEndDate = new Date();
    newEndDate.setMonth(newEndDate.getMonth() + parseInt(durationMonths));

    company.subscriptionEndDate = newEndDate;
    company.subscriptionStatus = 'active';

    await company.save();

    return res.status(200).json({
      message: 'Subscription renewed successfully',
      company: {
        _id: company._id,
        CompanyName: company.CompanyName,
        subscriptionEndDate: company.subscriptionEndDate,
      }
    });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
});

/**
 * Cancel subscription
 */
const cancelSubscription = asynchandler(async (req, res) => {
  try {
    const { companyId } = req.params;

    const company = await Company.findById(companyId);
    if (!company) {
      return res.status(404).json({ message: 'Company not found' });
    }

    company.isSubscribed = false;
    company.subscriptionStatus = 'cancelled';

    await company.save();

    return res.status(200).json({
      message: 'Subscription cancelled successfully',
      company: {
        _id: company._id,
        CompanyName: company.CompanyName,
        isSubscribed: company.isSubscribed,
      }
    });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
});

module.exports = {
  getSubscriptionStatus,
  subscribeCompany,
  renewSubscription,
  cancelSubscription,
  PLAN_LIMITS,
};
