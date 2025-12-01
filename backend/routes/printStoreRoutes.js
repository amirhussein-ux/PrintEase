const express = require('express');
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });
const { createPrintStore, getMyPrintStore, updateMyPrintStore, getLogoById, createPrintStoreTest } = require('../controllers/printStoreController');
const { protect } = require('../middleware/authMiddleware');
const auditLogger = require('../middleware/auditLogger');

const router = express.Router();

// owner routes (accept optional logo upload)
router.post('/', protect, auditLogger('create', 'Store'), upload.single('logo'), createPrintStore);
router.get('/mine', protect, getMyPrintStore);
router.put('/mine', protect, auditLogger('update', 'Store'), upload.single('logo'), updateMyPrintStore);

// public list
const { getAllPrintStores } = require('../controllers/printStoreController');
router.get('/list', getAllPrintStores);

// serve logo by id (public)
router.get('/logo/:id', getLogoById);

// dev test route
if (process.env.ALLOW_TEST_STORE_CREATION === 'true') {
	router.post('/test', createPrintStoreTest);
}

module.exports = router;