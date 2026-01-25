const express = require('express');
const router = express.Router();
const Verify = require('../Middleware/Verify');
const Deals = require('../Controllers/Deals');

// Create a deal (requires auth & proper role)
router.post('/create', Verify, Deals.createDeal);

// List all active deals
router.get('/', Deals.listDeals);

// List deals for a specific company (optionally include expired via ?includeExpired=true)
router.get('/company/:companyId', Verify,Deals.getCompanyDeals);

// Get a single deal for a specific company
router.get('/company/:companyId/:dealId', Verify,Deals.getCompanyDeal);

module.exports = router;
