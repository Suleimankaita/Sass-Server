const express = require('express');
const router = express.Router();
const { GetSettings, UpdateSettings } = require('../Controllers/CompanySettings');

// Ensure you have authentication middleware (e.g., protect)
// const { protect } = require('../Middleware/authMiddleware');

router.get('/', GetSettings);
router.put('/', UpdateSettings);

module.exports = router;