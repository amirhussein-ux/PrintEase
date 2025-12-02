const express = require('express');
const multer = require('multer');
const { protect } = require('../middleware/authMiddleware');
const { getStoreReviews, upsertMyReview, deleteMyReview, getReviewImageById } = require('../controllers/reviewController');

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

// GET store reviews
router.get('/store/:storeId', getStoreReviews);

// POST upsert my review (up to 5 images)
router.post(
	'/store/:storeId',
	protect,
	upload.fields([
		{ name: 'image', maxCount: 1 },
		{ name: 'images', maxCount: 5 },
	]),
	upsertMyReview
);

// DELETE my review
router.delete('/store/:storeId/me', protect, deleteMyReview);

// GET review image (GridFS)
router.get('/image/:id', getReviewImageById);

module.exports = router;
