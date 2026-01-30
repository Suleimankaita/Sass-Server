const express = require("express");
const router = express.Router();
const { getAllSystemData } = require("../Controllers/GetInventoryData");

// Route to get all data
// Endpoint: GET http://localhost:PORT/api/system/all-data
router.get("/all-data", getAllSystemData);

module.exports = router;