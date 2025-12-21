// routes/adminRoutes.js
const express = require('express');
const router = express.Router();
const { getAllAdmins, getAdminById } = require('../Controllers/get_i');
const als=require("../Controllers/at")


router.post('/', als);
router.get('/', getAllAdmins);
router.get('/:id', getAdminById);

module.exports = router;
