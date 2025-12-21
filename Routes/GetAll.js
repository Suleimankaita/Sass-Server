// routes/adminRoutes.js
const express = require('express');
const router = express.Router();
const { getAllAdmins, getAdminById } = require('../Controllers/get');

router.get('/', getAllAdmins);
router.get('/:id', getAdminById);

module.exports = router;
