const asyncHandler = require("express-async-handler");
const Company = require("../Models/Company");

const getCompanySubscriptionExpireDate = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (!id) {
    res.status(400);
    throw new Error("Company ID is required");
  }

  const company = await Company.findById(id).select(
    "subscriptionStatus trialEndDate subscriptionEndDate"
  );

  if (!company) {
    res.status(404);
    throw new Error("Company not found");
  }

  res.status(200).json({
    companyId: company._id,
    subscriptionStatus: company.subscriptionStatus,
    expireDate: company.trialEndDate, // ← virtual field
  });
});

module.exports = {
  getCompanySubscriptionExpireDate,
};