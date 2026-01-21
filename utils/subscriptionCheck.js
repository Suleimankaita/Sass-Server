/**
 * Check if a company's trial or subscription is valid
 * @param {Object} company - Company document from database
 * @returns {Object} - { isValid: boolean, status: string, message: string }
 */
const checkSubscriptionStatus = (company) => {
  const now = new Date();

  // If already subscribed and subscription is still active
  if (company.isSubscribed && company.subscriptionEndDate) {
    if (now < company.subscriptionEndDate) {
      return {
        isValid: true,
        status: "active",
        message: "Subscription is active",
        subscriptionEndDate: company.subscriptionEndDate,
      };
    } else {
      // Subscription has expired
      return {
        isValid: false,
        status: "expired",
        message: "Subscription has expired. Please renew to continue.",
      };
    }
  }

  // Check if trial is still valid (7 days)
  if (company.trialEndDate) {
    if (now < company.trialEndDate) {
      const daysRemaining = Math.ceil(
        (company.trialEndDate - now) / (1000 * 60 * 60 * 24)
      );
      return {
        isValid: true,
        status: "trial",
        message: `Trial period active. ${daysRemaining} day(s) remaining.`,
        daysRemaining,
        trialEndDate: company.trialEndDate,
      };
    } else {
      // Trial expired
      return {
        isValid: false,
        status: "trial_expired",
        message: "Trial period has expired. Please subscribe to continue.",
      };
    }
  }

  // Default: trial not started or missing data
  return {
    isValid: false,
    status: "no_trial",
    message: "No valid trial or subscription found.",
  };
};

/**
 * Check if a user can log in based on their company's subscription status
 * @param {Object} user - User/Admin document
 * @param {Object} company - Company document
 * @param {string} userRole - User's role (e.g., "Admin", "manager", "cashier")
 * @returns {Object} - { canLogin: boolean, message: string }
 */
const canUserLogin = (user, company, userRole) => {
  // Admins can always log in
  if (user.Role === "Admin" || userRole === "admin") {
    return {
      canLogin: true,
      message: "Admin access granted",
    };
  }

  // For regular users, check subscription status
  const subStatus = checkSubscriptionStatus(company);

  if (subStatus.isValid) {
    return {
      canLogin: true,
      message: subStatus.message,
      subscriptionStatus: subStatus.status,
    };
  }

  return {
    canLogin: false,
    message: subStatus.message,
    subscriptionStatus: subStatus.status,
  };
};

module.exports = {
  checkSubscriptionStatus,
  canUserLogin,
};
