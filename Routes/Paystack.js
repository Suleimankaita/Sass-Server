const router = require("express").Router();
const { createOrderWithPaystack } = require("../Controllers/paystack");

router.post("/", createOrderWithPaystack);

module.exports = router;
