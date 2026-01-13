const express = require('express');
const router = express.Router();
const { updateCompanyUser } = require('../Controllers/UpdateCompanyUser');
const Verify=require('../Middleware/Verify')

// Ensure you have your auth middleware here
router.put('/:id',Verify, updateCompanyUser);

module.exports = router;