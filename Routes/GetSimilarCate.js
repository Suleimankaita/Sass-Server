const express = require('express');
const router = express.Router();
const CategoryController = require('../Controllers/GetSimilarcate');

/**
 * @route   GET /api/categories/search
 * @desc    Intelligent semantic search through all company-created categories
 * @access  Public
 * @query   ?name=laptop
 */
router.get('/search', CategoryController.findRelated);

/**
 * @route   POST /api/categories/seed
 * @desc    One-time setup to populate the DB with sample categories for testing
 * @access  Private/Internal
 */
router.post('/seed', async (req, res) => {
    try {
        const Categories = require('../Models/Categories');
        const sampleData = [
            { name: "Macbook & Computing" },
            { name: "iPhone Pro Max" },
            { name: "Gaming Mechanical Keyboards" },
            { name: "Leather Handbags" },
            { name: "Wireless Headphones" },
            { name: "Kitchen Microwaves" },
            { name: "Sports Sneakers" },
            { name: "Office Stationery" }
        ];
        
        await Categories.deleteMany({}); // Clear existing
        await Categories.insertMany(sampleData);
        res.status(201).json({ message: "Test categories seeded!", count: sampleData.length });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;