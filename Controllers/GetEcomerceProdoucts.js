const EcomerceProducts = require("../Models/EcomerceProducts");
const Company = require("../Models/Company");
const Branch = require("../Models/Branch");

/**
 * 1. GET ALL PRODUCTS (Unified Company & Branch)
 * Fetches products tied to active companies OR active branches.
 */
const NEW_PRODUCT_DAYS = 7;

const GetEcomerceProducts = async (req, res) => {
  try {
    const now = new Date();
    const newThreshold = new Date();
    newThreshold.setDate(now.getDate() - NEW_PRODUCT_DAYS);

    // 1. Active companies
    const activeCompanies = await Company.find({
      $or: [
        { subscriptionStatus: "trial", trialEndDate: { $gte: now } },
        {
          subscriptionStatus: "active",
          isSubscribed: true,
          subscriptionEndDate: { $gte: now },
        },
      ],
    }).select("_id CompanyName").lean();

    // 2. Active branches
    const activeBranches = await Branch.find({
      $or: [{ expireAt: { $gte: now } }, { expireAt: { $exists: false } }],
    }).select("_id branchName").lean();

    const companyIds = activeCompanies.map(c => c._id);
    const branchIds = activeBranches.map(b => b._id);

    // 3. Fetch products
    const products = await EcomerceProducts.find({
      quantity: { $gt: 0 },
      $or: [
        { companyId: { $in: companyIds } },
        { branchId: { $in: branchIds } },
      ],
    }).lean();

    // 4. Lookup maps
    const companyMap = new Map(
      activeCompanies.map(c => [c._id.toString(), c.CompanyName])
    );

    const branchMap = new Map(
      activeBranches.map(b => [b._id.toString(), b.branchName])
    );

    // 5. Normalize + add flags
    const data = products.map(p => {
      let sourceName = "Unknown Store";
      let entityType = "unknown";

      if (p.branchId && branchMap.has(p.branchId.toString())) {
        sourceName = branchMap.get(p.branchId.toString());
        entityType = "branch";
      } else if (p.companyId && companyMap.has(p.companyId.toString())) {
        sourceName = companyMap.get(p.companyId.toString());
        entityType = "company";
      }

      const isNew = p.createdAt && p.createdAt >= newThreshold;
      const isBestSeller =
        p.quantity > 0 &&
        p.soldAtPrice >= p.actualPrice;

      return {
        ...p,
        sourceName,
        entityType,
        isNew,
        isBestSeller,
      };
    });

    // 6. Sort: Best sellers first, then by price
    data.sort((a, b) => {
      if (a.isBestSeller && !b.isBestSeller) return -1;
      if (!a.isBestSeller && b.isBestSeller) return 1;
      return a.soldAtPrice - b.soldAtPrice;
    });

    res.status(200).json({
      success: true,
      count: data.length,
      data,
    });
  } catch (err) {
    console.error("GetEcomerceProducts error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};
const GetEcomerceProductsByCompany = async (req, res) => {
  try {
    const { companyId } = req.params;
    const currentDate = new Date();
    const newThreshold = new Date();
    newThreshold.setDate(currentDate.getDate() - NEW_PRODUCT_DAYS);

    const company = await Company.findById(companyId).lean();
    if (!company) {
      return res.status(404).json({ success: false, message: "Company not found" });
    }

    const isActive =
      (company.subscriptionStatus === "trial" && company.trialEndDate >= currentDate) ||
      (company.subscriptionStatus === "active" &&
        company.isSubscribed &&
        company.subscriptionEndDate >= currentDate);

    if (!isActive) {
      return res.status(403).json({ success: false, message: "Company subscription expired" });
    }

    const branches = await Branch.find({ CompanyId: companyId })
      .select("_id")
      .lean();

    const branchIds = branches.map(b => b._id);

    const products = await EcomerceProducts.find({
      $or: [
        { companyId },
        { branchId: { $in: branchIds } },
      ],
      quantity: { $gt: 0 },
    }).lean();

    const data = products.map(p => ({
      ...p,
      isNew: p.createdAt && p.createdAt >= newThreshold,
      isBestSeller: p.quantity > 0 && p.soldAtPrice >= p.actualPrice,
    }));

    res.status(200).json({
      success: true,
      count: data.length,
      companyName: company.CompanyName,
      data,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * 3. GET PRODUCTS BY BRANCH
 */
const GetEcomerceProductsByBranch = async (req, res) => {
  try {
    const { branchId } = req.params;
    const currentDate = new Date();

    const branch = await Branch.findById(branchId).lean();
    if (!branch) return res.status(404).json({ success: false, message: "Branch not found" });

    if (branch.expireAt && branch.expireAt < currentDate) {
      return res.status(403).json({ success: false, message: "Branch subscription expired" });
    }

    // Fetch products tied directly to this branch
    const products = await EcomerceProducts.find({
      branchId: branchId,
      quantity: { $gt: 0 }
    }).lean();

    res.status(200).json({
      success: true,
      count: products.length,
      branchName: branch.CompanyName,
      data: products.map(p => ({ ...p, sourceName: branch.CompanyName, entityType: "branch" })),
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  GetEcomerceProducts,
  GetEcomerceProductsByCompany,
  GetEcomerceProductsByBranch,
};