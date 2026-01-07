const express = require("express");
const router = express.Router();
const  getMergedProductById   = require("../Controllers/GetSingleProduct");
const Verify  = require("../Middleware/Verify");

// Single route to find product by ID
router.get("/:companyId/:productId",Verify, getMergedProductById );

module.exports = router;