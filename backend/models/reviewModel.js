const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema(
  {
    store: { type: mongoose.Schema.Types.ObjectId, ref: 'PrintStore', required: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, default: '' },
  // Legacy single image
    imageFileId: { type: mongoose.Schema.Types.ObjectId, default: null },
    imageMime: { type: String, default: null },
    imageFilename: { type: String, default: null },
  // Multiple images
    images: [
      new mongoose.Schema(
        {
          fileId: { type: mongoose.Schema.Types.ObjectId, required: true },
          mime: { type: String, default: null },
          filename: { type: String, default: null },
        },
        { _id: false }
      ),
    ],
  },
  { timestamps: true }
);

// One review per user per store
reviewSchema.index({ store: 1, user: 1 }, { unique: true });

module.exports = mongoose.model('Review', reviewSchema);
