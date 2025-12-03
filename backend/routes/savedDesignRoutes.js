const express = require('express');
const multer = require('multer');
const { protect } = require('../middleware/authMiddleware');
const {
  saveDesign,
  getMyDesigns,
  getDesignById,
  updateDesign,
  deleteDesign,
  downloadDesignImage,
  convertToOrder,
  getThumbnail
} = require('../controllers/savedDesignController');

const router = express.Router();

// Configure multer for file upload
const storage = multer.memoryStorage();
const upload = multer({ 
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Accept images only
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'), false);
    }
  }
});

// All routes require authentication
router.use(protect);

// FIXED: Accept multiple files (designFile and thumbnail)
router.post('/', upload.fields([
  { name: 'designFile', maxCount: 1 },
  { name: 'thumbnail', maxCount: 1 }
]), saveDesign);

// Get all designs for current user
router.get('/', getMyDesigns);

// Get single design
router.get('/:id', getDesignById);

// Update design metadata
router.patch('/:id', updateDesign);

// Delete design
router.delete('/:id', deleteDesign);

// Download design image
router.get('/:id/image', downloadDesignImage);

// FIXED: Add public thumbnail route (no authentication required for thumbnails)
router.get('/:userId/thumbnail/:thumbnailId', getThumbnail);

// Convert design to order
router.post('/:id/convert-to-order', convertToOrder);

module.exports = router;