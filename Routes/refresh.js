const express = require("express");
const router = express.Router();
const { refreshToken } = require("../controllers/refreshtoken");
const  Verify = require("../Middleware/Verify");

router.post("/refresh", refreshToken);

module.exports = router;
