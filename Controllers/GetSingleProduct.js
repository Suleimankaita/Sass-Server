const EcomerceProducts = require("../Models/EcomerceProducts");
const POSProduct = require("../Models/POSProduct");
const Company = require("../Models/Company"); // Using Company/Branch directly
const asyncHandler = require("express-async-handler");

// @desc    Get a single merged product by ID using Company/Branch ID
// @route   GET /api/products/:companyId/:productId
const getMergedProductById = asyncHandler(async (req, res) => {
  const { companyId, productId } = req.params;

  // 1. Fetch Company/Branch directly and populate its product arrays
  const company = await Company.findById(companyId)
    .populate("EcomerceProducts")
    .populate("POSProductsId");

  if (!company) {
    res.status(404);
    throw new Error("Company or Branch not found");
  }

  // 2. Extract arrays and helper for clean data
  // Using the arrays directly from the company object
  const allPOS = company.POSProductsId || [];
  const allEcom = company.EcomerceProducts || [];
  const getCleanData = (item) => (item._doc ? item._doc : item);

  // 3. Identify the base product from either array to get the SKU
  const baseProduct = allPOS.find(p => p._id.toString() === productId) || 
                      allEcom.find(p => p._id.toString() === productId);

  if (!baseProduct) {
    res.status(404);
    throw new Error("Product not found in company inventory");
  }

  const targetSku = baseProduct.sku;

  // 4. Find both versions using the SKU to perform the merge
  const posVersion = allPOS.find(p => p.sku === targetSku);
  const ecomVersion = allEcom.find(p => p.sku === targetSku);

  let mergedResult = {};
  const posData = posVersion ? getCleanData(posVersion) : null;
  const ecomData = ecomVersion ? getCleanData(ecomVersion) : null;

  if (posData && ecomData) {
    // Both found: Merge data and SUM quantities
    mergedResult = {
      ...ecomData, // Descriptions and web info
      ...posData,  // POS specific details
      _id: productId,
      sku: targetSku,
      // MERGE LOGIC: Summing quantity from both sources
      quantity: (Number(posData.quantity) || 0) + (Number(ecomData.quantity) || 0),
      foundIn: ['POS', 'Ecomerce'],
      syncStatus: "Fully Synced",
      lastSync: new Date(Math.max(new Date(posData.updatedAt), new Date(ecomData.updatedAt)))
    };
  } else {
    // Only found in one system (POS or E-commerce)
    const singleData = posData || ecomData;
    mergedResult = {
      ...getCleanData(singleData),
      quantity: Number(singleData.quantity) || 0,
      description:singleData.description,
      foundIn: posData ? ['POS'] : ['Ecomerce'],
      syncStatus: `Only in ${posData ? 'POS' : 'Ecomerce'}`
    };
  }

  res.status(200).json({
    success: true,
    product: mergedResult
  });
});

module.exports = getMergedProductById ;