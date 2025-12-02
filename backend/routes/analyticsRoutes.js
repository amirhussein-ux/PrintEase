const express = require('express');
const router = express.Router();
const { getPrescriptiveAnalysis, getBestSellingServices } = require('../controllers/analyticsController');
const { protect } = require('../middleware/authMiddleware');

// Get prescriptive analysis for owner
router.get('/prescriptive', protect, getPrescriptiveAnalysis);

// Get best selling services for customer display
router.get('/best-selling/:storeId', getBestSellingServices);

module.exports = router;
