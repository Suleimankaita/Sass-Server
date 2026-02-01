const express = require("express");
const router = express.Router();
const  GetUserNotification   = require("../Controllers/GetUserNotification");
const Verify  = require("../Middleware/Verify");

// Single route to find product by ID
router.get("/",Verify, GetUserNotification );

module.exports = router;