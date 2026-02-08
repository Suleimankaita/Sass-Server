const express = require("express");
const router = express.Router();
const Balance  = require("../Controllers/PayoutCommision");
const  Verify = require("../Middleware/Verify");

router.post("/",Verify, Balance);

module.exports = router;
