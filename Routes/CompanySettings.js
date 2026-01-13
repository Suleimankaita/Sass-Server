const express = require('express');
const router = express.Router();
const { GetSettings, UpdateSettings } = require('../Controllers/CompanySettings');
const Verify=require('../Middleware/Verify')

// Ensure you have authentication middleware (e.g., protect)
// const { protect } = require('../Middleware/authMiddleware');

router.get('/',Verify, GetSettings);
router.put('/',Verify, UpdateSettings);

module.exports = router;