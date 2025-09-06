const express = require('express');
const { createPrintStore, getMyPrintStore } = require('../controllers/printStoreController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

// admin routes
router.post('/', protect, createPrintStore);
router.get('/mine', protect, getMyPrintStore);

// public list
const { getAllPrintStores } = require('../controllers/printStoreController');
router.get('/list', getAllPrintStores);

// dev test route
if (process.env.ALLOW_TEST_STORE_CREATION === 'true') {
	router.post('/test', createPrintStoreTest);
}

module.exports = router;
