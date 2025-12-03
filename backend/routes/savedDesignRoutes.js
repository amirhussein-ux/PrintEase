// routes/savedDesignRoutes.js
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

// Configure multer - FIXED with larger limits for data URLs
const storage = multer.memoryStorage();
const upload = multer({ 
  storage,
  limits: { 
    fileSize: 20 * 1024 * 1024, // 20MB for files
    fieldSize: 20 * 1024 * 1024, // 20MB for form fields (CRITICAL for data URLs!)
    fields: 20, // Maximum number of fields
    parts: 30,  // Maximum number of parts (fields + files)
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'), false);
    }
  }
});

// All routes require authentication
router.use(protect);

// Upload routes
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

// Download design image - FIXED: This should be the main image endpoint
router.get('/:id/image', downloadDesignImage);

// Alternative image endpoint (for testing)
router.get('/:id/image/download', downloadDesignImage);

// Thumbnail route
router.get('/:userId/thumbnail/:thumbnailId', getThumbnail);

// Convert design to order
router.post('/:id/convert-to-order', convertToOrder);

// DEBUG: Test if images are being saved correctly
router.get('/debug/:designId', async (req, res) => {
  try {
    const { designId } = req.params;
    const mongoose = require('mongoose');
    const SavedDesign = require('../models/savedDesignModel');
    
    const design = await SavedDesign.findById(designId);
    
    if (!design) {
      return res.status(404).json({ message: 'Design not found' });
    }
    
    console.log('🔍 DEBUG - Design:', {
      id: design._id,
      name: design.name,
      productType: design.productType,
      designFile: design.designFile,
      thumbnail: design.thumbnail,
      customization: design.customization,
      hasOriginalImage: !!design.customization?.originalImage,
      originalImageLength: design.customization?.originalImage?.length || 0,
      originalImagePreview: design.customization?.originalImage?.substring(0, 100) || 'none'
    });
    
    // Check GridFS
    const db = mongoose.connection.db;
    let gridfsInfo = { exists: false };
    
    if (db && design.designFile?.fileId) {
      try {
        const bucket = new mongoose.mongo.GridFSBucket(db, { bucketName: 'uploads' });
        const files = await bucket.find({ _id: design.designFile.fileId }).toArray();
        gridfsInfo = {
          exists: files.length > 0,
          count: files.length,
          file: files[0] ? { 
            filename: files[0].filename, 
            length: files[0].length,
            uploadDate: files[0].uploadDate 
          } : null
        };
      } catch (gridfsError) {
        gridfsInfo.error = gridfsError.message;
      }
    }
    
    res.json({
      success: true,
      design: {
        id: design._id,
        name: design.name,
        productType: design.productType,
        designFile: design.designFile,
        thumbnail: design.thumbnail,
        customization: design.customization,
        thumbnailUrl: design.thumbnailUrl,
        designUrl: design.designUrl,
        originalImageUrl: design.originalImageUrl,
        // Test URLs
        imageUrl: `${req.protocol}://${req.get('host')}/api/saved-designs/${design._id}/image`,
        downloadUrl: `${req.protocol}://${req.get('host')}/api/saved-designs/${design._id}/image/download`,
        thumbnailUrlTest: design.thumbnail ? 
          `${req.protocol}://${req.get('host')}/api/saved-designs/${design.user}/thumbnail/${design.thumbnail}` : null
      },
      gridfs: gridfsInfo,
      serverInfo: {
        host: req.get('host'),
        protocol: req.protocol
      }
    });
  } catch (error) {
    console.error('❌ Debug route error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;