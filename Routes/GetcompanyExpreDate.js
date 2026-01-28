const express = require("express");
const router = express.Router();
const {
  getCompanySubscriptionExpireDate,
} = require("../Controllers/GetCompanyExpireDate");

router.get("/company/expire-date/:id/", getCompanySubscriptionExpireDate);

module.exports = router;