const express = require('express');
const { protect } = require('../middleware/authMiddleware');
const auditLogger = require('../middleware/auditLogger');
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });
const {
  createService,
  updateService,
  deleteService,
  listMyServices,
  listByStore,
  getServiceImage,
  getServicesWithInventoryStatus,
  listDeleted,
  restoreService,
} = require('../controllers/serviceController');

const router = express.Router();

// owner
router.get('/mine', protect, listMyServices);
router.get('/mine/with-inventory', protect, getServicesWithInventoryStatus);
router.get('/mine/deleted', protect, listDeleted);
router.post('/', protect, auditLogger('create', 'Service'), upload.single('image'), createService);
router.put('/:id', protect, auditLogger('update', 'Service'), upload.single('image'), updateService);
router.delete('/:id', protect, auditLogger('delete', 'Service'), deleteService);
router.post('/:id/restore', protect, auditLogger('restore', 'Service'), restoreService);

// public
router.get('/store/:storeId', listByStore);
router.get('/:id/image', getServiceImage);

module.exports = router;