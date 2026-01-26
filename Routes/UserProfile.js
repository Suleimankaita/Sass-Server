const express = require("express");
const router = express.Router();
const GetUserprofile  = require("../controllers/UserProfile");
const  Verify = require("../Middleware/Verify");

router.get("/",Verify, GetUserprofile);

module.exports = router;
