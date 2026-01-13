// routes/adminRoutes.js
const express = require('express');
const router = express.Router();
const { getAllAdmins, getAdminById } = require('../Controllers/get');
const Verify = require('../Middleware/Verify');

router.get('/', Verify,getAllAdmins);
router.get('/:id', Verify,getAdminById);

module.exports = router;
