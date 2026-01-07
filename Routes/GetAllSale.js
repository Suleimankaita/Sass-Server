const express = require('express');
const router = express.Router();
const GetAllSales = require('../Controllers/GetAllSales');
const Verify = require('../Middleware/Verify');

router.get('/',Verify, GetAllSales);

module.exports = router;
