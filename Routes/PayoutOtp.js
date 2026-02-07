const {Generate}=require("../Controllers/PayoutOtp")
const Verify=require("../Middleware/Verify")

const router = require("express").Router();

router.post("/", Verify,Generate);

module.exports=router