const express = require("express");
const {
  GetEcomerceProducts,
  GetEcomerceProductsByCompany,
  GetEcomerceProductsByBranch,
} = require("../Controllers/GetEcomerceProdoucts");

const router = express.Router();

/**
 * GET /api/ecommerce-products
 * Get all ecommerce products from all companies and branches with active subscriptions
 * Includes company name with each product
 */
router.get("/", GetEcomerceProducts);

/**
 * GET /api/ecommerce-products/company/:companyId
 * Get all ecommerce products for a specific company with active subscription
 */
router.get("/company/:companyId", GetEcomerceProductsByCompany);

/**
 * GET /api/ecommerce-products/branch/:branchId
 * Get all ecommerce products for a specific branch with active subscription
 */
router.get("/branch/:branchId", GetEcomerceProductsByBranch);

module.exports = router;
