const express = require("express");
const router = express.Router();
const  GetSingleEconmerceProduct   = require("../Controllers/GetSingleEconmerceProduct");
const Verify  = require("../Middleware/Verify");

// Single route to find product by ID
router.get("/:id", GetSingleEconmerceProduct );

module.exports = router;