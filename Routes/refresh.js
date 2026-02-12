const express = require("express");
const router = express.Router();
const { refreshToken } = require("../Controllers/Refreshtoken");
const  Verify = require("../Middleware/Verify");

router.post("/refresh", refreshToken);

module.exports = router;
