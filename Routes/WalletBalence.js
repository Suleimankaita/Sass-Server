const express = require("express");
const router = express.Router();
const Balance  = require("../Controllers/WalletBalence");
const  Verify = require("../Middleware/Verify");

router.get("/",Verify, Balance);

module.exports = router;
    