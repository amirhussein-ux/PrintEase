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
  downloadDownPaymentReceipt,
  previewDownPaymentReceipt,
  confirmPickupByToken,
} = require('../controllers/orderController');

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

// Create order (optional files + optional downpayment receipt)
// accept both `files` (order attachments) and `receipt` (downpayment proof)
router.post('/', protect, upload.fields([{ name: 'files', maxCount: 10 }, { name: 'receipt', maxCount: 1 }]), createOrder);

// List my orders
router.get('/mine', protect, getMyOrders);

// List by store
router.get('/store/:storeId', protect, getOrdersForStore);

// Get order by id
router.get('/:id', protect, getOrderById);

// Update order status
router.patch('/:id/status', protect, updateOrderStatus);

// Download order file
router.get('/:id/files/:fileId', protect, downloadOrderFile);

// Download downpayment receipt (if present)
router.get('/:id/downpayment/receipt', protect, downloadDownPaymentReceipt);
// Preview downpayment receipt (inline)
router.get('/:id/downpayment/preview', protect, previewDownPaymentReceipt);

// Confirm pickup by token (GET supported)
router.post('/pickup/:token/confirm', confirmPickupByToken);
router.get('/pickup/:token/confirm', confirmPickupByToken);

module.exports = router;
