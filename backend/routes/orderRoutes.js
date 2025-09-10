const express = require('express');
const multer = require('multer');
const { protect } = require('../middleware/authMiddleware');
const {
  createOrder,
  getMyOrders,
  getOrdersForStore,
  getOrderById,
  updateOrderStatus,
  downloadOrderFile,
  confirmPickupByToken,
} = require('../controllers/orderController');

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

// Create order (optional files)
router.post('/', protect, upload.array('files', 10), createOrder);

// List my orders
router.get('/mine', protect, getMyOrders);

// List by store
router.get('/store/:storeId', getOrdersForStore);

// Get order by id
router.get('/:id', protect, getOrderById);

// Update order status
router.patch('/:id/status', protect, updateOrderStatus);

// Download order file
router.get('/:id/files/:fileId', protect, downloadOrderFile);

// Confirm pickup by token (GET supported)
router.post('/pickup/:token/confirm', confirmPickupByToken);
router.get('/pickup/:token/confirm', confirmPickupByToken);

module.exports = router;
