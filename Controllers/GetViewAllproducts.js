const ProductView = require("../Models/ProductsView");
const Company = require("../Models/Company");
const Branch = require("../Models/Branch");
const asyncHandler = require("express-async-handler");

const GetViewAllProducts = asyncHandler(async (req, res) => {
  const { companyId } = req.query;

  if (!companyId) {
    return res.status(400).json({ message: "companyId is required" });
  }

  const [company, branch] = await Promise.all([
    Company.findById(companyId).populate({
        path: "ProductViewsId",
          options: { sort: { createdAt: -1 } }

    }),
    Branch.findById(companyId).populate({
          path: "ProductViewsId",
          options: { sort: { createdAt: -1 } }
}),
  ]);

  if (!company && !branch) {
    return res.status(404).json({ message: "Company or Branch not found" });
  }

  if (company) {
    return res.status(200).json({
      type: "company",
      data: company.ProductViewsId,
    });
  }

  return res.status(200).json({
    type: "branch",
    data: branch.ProductViewsId,
  });
});

module.exports = GetViewAllProducts;