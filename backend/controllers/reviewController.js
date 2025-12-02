const Review = require('../models/reviewModel');
const PrintStore = require('../models/printStoreModel');
const mongoose = require('mongoose');
const { ObjectId } = mongoose.Types;

// GET /reviews/store/:storeId
exports.getStoreReviews = async (req, res) => {
  try {
    const { storeId } = req.params;
    const reviews = await Review.find({ store: storeId })
      .populate('user', 'firstName lastName')
      .sort({ createdAt: -1 });
    const avg = reviews.length
      ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
      : 0;
    res.json({ reviews, averageRating: Number(avg.toFixed(2)), count: reviews.length });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// POST /reviews/store/:storeId (create/update my review)
exports.upsertMyReview = async (req, res) => {
  try {
    const { storeId } = req.params;
    const userId = req.user.id;
    const { rating, comment } = req.body;

    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ message: 'Rating must be between 1 and 5' });
    }

    const store = await PrintStore.findById(storeId);
    if (!store) return res.status(404).json({ message: 'Store not found' });

  // Base fields
    const update = { rating, comment: comment || '' };

  // Upsert review
    const review = await Review.findOneAndUpdate(
      { store: storeId, user: userId },
      { $set: update },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

  // Append uploaded images (if any)
    const filesArray = Array.isArray(req.files)
      ? req.files
      : [
          ...((req.files && req.files.images) || []),
          ...((req.files && req.files.image) || []),
        ];
    if (Array.isArray(filesArray) && filesArray.length > 0) {
      const bucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db, { bucketName: 'uploads' });
      const currentCount = Array.isArray(review.images) ? review.images.length : 0;
      const remaining = Math.max(0, 5 - currentCount);
      const toProcess = filesArray.slice(0, remaining);
      for (const f of toProcess) {
        if (!f || !f.buffer) continue;
        const uploadStream = bucket.openUploadStream(f.originalname || 'review-image', {
          contentType: f.mimetype,
        });
        uploadStream.end(f.buffer);
        const fileId = await new Promise((resolve, reject) => {
          uploadStream.on('finish', () => resolve(uploadStream.id));
          uploadStream.on('error', reject);
        });
        review.images = review.images || [];
        review.images.push({ fileId, mime: f.mimetype || null, filename: f.originalname || null });
      }
  await review.save();
    }

    res.status(201).json(review);
  } catch (err) {
  // Duplicate key
    if (err.code === 11000) {
      return res.status(409).json({ message: 'You already reviewed this store' });
    }
    res.status(500).json({ message: err.message });
  }
};

// DELETE /reviews/store/:storeId/me
exports.deleteMyReview = async (req, res) => {
  try {
    const { storeId } = req.params;
    const userId = req.user.id;
    const deleted = await Review.findOneAndDelete({ store: storeId, user: userId });
    if (!deleted) return res.status(404).json({ message: 'No review to delete' });
    res.json({ message: 'Review deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /reviews/image/:id (GridFS stream)
exports.getReviewImageById = async (req, res) => {
  try {
    const id = req.params.id;
    if (!ObjectId.isValid(id)) return res.status(400).send('Invalid id');
    const bucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db, { bucketName: 'uploads' });
    const _id = new ObjectId(id);
    const files = await bucket.find({ _id }).toArray();
    if (!files || files.length === 0) return res.status(404).send('Not found');
    const file = files[0];
    res.set('Content-Type', file.contentType || 'application/octet-stream');
    const download = bucket.openDownloadStream(_id);
    download.pipe(res);
    download.on('error', () => res.status(500).end());
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
