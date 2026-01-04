const express = require('express');
const router = express.Router();
const Verify = require('../Middleware/Verify');
const PriceController = require('../Controllers/FoodPrice');

// Create a price (protected)
router.post('/', PriceController.createPrice);

// Get a single price by id
router.get('/:id', PriceController.getPrice);

// List prices (optional query: companyId, active)
router.get('/', PriceController.listPrices);

// Update price (protected)
router.put('/:id', Verify, PriceController.updatePrice);

// Soft-delete price (protected)
router.delete('/:id', Verify, PriceController.deletePrice);

// Bulk update prices (protected) - accepts array of {id, fields}
router.post('/bulk', Verify, PriceController.bulkUpdate);

module.exports = router;
