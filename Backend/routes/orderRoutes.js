const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { createOrder, getOrdersForUserOrGuest, updateOrderStatus } = require('../controllers/orderController');

// Set up multer for file uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, path.join(__dirname, '../uploads/'));
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + '-' + file.originalname);
    }
});
const upload = multer({ storage: storage });


// POST /api/orders (with file upload)
router.post('/', upload.single('designFile'), createOrder);

// GET /api/orders?customerEmail=... or ?guestToken=...
router.get('/', getOrdersForUserOrGuest);


// PUT /api/orders/:id/status
router.put('/:id/status', updateOrderStatus);

module.exports = router;