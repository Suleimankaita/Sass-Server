const express = require('express');
const router = express.Router();
const { updateCompanyUser } = require('../Controllers/UpdateCompanyUser');

// Ensure you have your auth middleware here
router.put('/:id', updateCompanyUser);

module.exports = router;