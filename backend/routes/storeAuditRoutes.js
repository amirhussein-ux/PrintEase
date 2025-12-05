const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { getStoreAuditLogs } = require('../controllers/storeAuditController');

router.use(protect);
router.get('/', getStoreAuditLogs);
router.get('/mine', getStoreAuditLogs);  

module.exports = router;