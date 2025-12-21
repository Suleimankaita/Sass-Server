const express = require('express');
const router = express.Router();

// Controllers
const CompanyRegs = require('../Controllers/CompanyReg');
const AdminRegs = require('../Controllers/adminController');
const { ProductRegs, CreateOrder } = require('../Controllers/productController');

// Routes
router.post('/admin/register', AdminRegs);
router.post('/company/register', CompanyRegs);
router.post('/product/add', ProductRegs);
router.post('/order/create', CreateOrder);

module.exports = router;
