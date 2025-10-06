const express = require('express');
const { protect } = require('../middleware/authMiddleware');
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
} = require('../controllers/serviceController');

const router = express.Router();

// owner
router.get('/mine', protect, listMyServices);
router.get('/mine/with-inventory', protect, getServicesWithInventoryStatus);
router.post('/', protect, upload.single('image'), createService);
router.put('/:id', protect, upload.single('image'), updateService);
router.delete('/:id', protect, deleteService);

// public
router.get('/store/:storeId', listByStore);
router.get('/:id/image', getServiceImage);

module.exports = router;
