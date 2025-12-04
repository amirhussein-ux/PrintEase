const express = require('express');
const multer = require('multer');
const { protect } = require('../middleware/authMiddleware');
const auditLogger = require('../middleware/auditLogger');
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
  submitReturnRequest,
  markReturnRequestForwarded,
  reviewReturnRequest,
  streamReturnEvidence,
} = require('../controllers/orderController');

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

// Create order (optional files + optional downpayment receipt)
// accept both `files` (order attachments) and `receipt` (downpayment proof)
router.post('/', protect, auditLogger('create', 'Order'), upload.fields([{ name: 'files', maxCount: 10 }, { name: 'receipt', maxCount: 1 }]), createOrder);

// List my orders
router.get('/mine', protect, getMyOrders);

// List by store
router.get('/store/:storeId', protect, getOrdersForStore);

// Get order by id
router.get('/:id', protect, getOrderById);

// Update order status
router.patch('/:id/status', protect, auditLogger('update', 'Order'), updateOrderStatus);

router.post(
  '/:id/return-request',
  protect,
  auditLogger('create', 'ReturnRequest'),
  upload.array('evidence', 6),
  submitReturnRequest
);

router.patch(
  '/:id/return-request',
  protect,
  auditLogger('update', 'ReturnRequest'),
  reviewReturnRequest
);

router.patch(
  '/:id/return-request/chat-forward',
  protect,
  auditLogger('update', 'ReturnRequest'),
  markReturnRequestForwarded
);

router.get(
  '/:id/return-request/evidence/:fileId',
  protect,
  auditLogger('view', 'ReturnRequestEvidence'),
  streamReturnEvidence
);

// Download order file
router.get('/:id/files/:fileId', protect, auditLogger('download', 'Order File'), downloadOrderFile);

// Download downpayment receipt (if present)
router.get('/:id/downpayment/receipt', protect, auditLogger('download', 'Receipt'), downloadDownPaymentReceipt);
// Preview downpayment receipt (inline)
router.get('/:id/downpayment/preview', protect, auditLogger('view', 'Receipt'), previewDownPaymentReceipt);

// Confirm pickup by token (GET supported)
router.post('/pickup/:token/confirm', auditLogger('update', 'Order Pickup'), confirmPickupByToken);
router.get('/pickup/:token/confirm', auditLogger('update', 'Order Pickup'), confirmPickupByToken);

module.exports = router;