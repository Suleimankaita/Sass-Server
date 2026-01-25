const router = require("express").Router();
const { createOrderWithPaystack } = require("../controllers/paystack");

router.post("/", createOrderWithPaystack);

module.exports = router;