// backend/controllers/savedDesignController.js - COMPLETE FIXED VERSION
const mongoose = require('mongoose');
const SavedDesign = require('../models/savedDesignModel');

// Save a design - FIXED VERSION
exports.saveDesign = async (req, res) => {
  try {
    console.log("🔍 Received save design request:", {
      body: req.body,
      files: req.files ? {
        designFile: req.files.designFile ? {
          originalname: req.files.designFile[0].originalname,
          size: req.files.designFile[0].size,
          mimetype: req.files.designFile[0].mimetype
        } : 'No design file',
        thumbnail: req.files.thumbnail ? {
          originalname: req.files.thumbnail[0].originalname,
          size: req.files.thumbnail[0].size,
          mimetype: req.files.thumbnail[0].mimetype
        } : 'No thumbnail file'
      } : 'No files',
      fields: Object.keys(req.body)
    });

    // Get user
    const user = req.user;
    if (!user) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    // Parse the design data
    const productType = req.body.productType;
    const color = req.body.color;
    const name = req.body.name;
    const storeId = req.body.storeId;
    
    // Parse JSON fields
    let customization = {};
    let tags = [];
    
    try {
      if (req.body.customization) {
        customization = JSON.parse(req.body.customization);
        console.log("✅ Parsed customization:", {
          position: customization.position,
          scale: customization.scale,
          hasOriginalImage: !!customization.originalImage
        });
      }
      
      if (req.body.tags) {
        tags = JSON.parse(req.body.tags);
      }
    } catch (parseError) {
      console.error('Error parsing JSON fields:', parseError);
      return res.status(400).json({ 
        message: 'Invalid JSON format in customization or tags',
        error: parseError.message 
      });
    }

    // Validate required fields
    if (!productType || !color || !storeId) {
      console.error('Missing required fields:', {
        productType: !!productType,
        color: !!color,
        storeId: !!storeId
      });
      return res.status(400).json({ 
        message: 'productType, color, and storeId are required' 
      });
    }

    // Check for design file upload
    if (!req.files || !req.files.designFile || req.files.designFile.length === 0) {
      console.error('No design file uploaded');
      return res.status(400).json({ 
        message: 'Design image is required' 
      });
    }

    const designFile = req.files.designFile[0];
    const thumbnailFile = req.files.thumbnail ? req.files.thumbnail[0] : null;

    // Handle database connection
    const db = mongoose.connection.db;
    if (!db) {
      console.error('Database connection not established');
      return res.status(500).json({ 
        message: 'Database connection error' 
      });
    }

    try {
      // Upload main design file to GridFS
      const bucket = new mongoose.mongo.GridFSBucket(db, { 
        bucketName: 'uploads' 
      });

      const uploadStream = bucket.openUploadStream(
        designFile.originalname, 
        { 
          contentType: designFile.mimetype,
          metadata: {
            userId: user._id.toString(),
            type: 'design',
            timestamp: new Date()
          }
        }
      );

      uploadStream.end(designFile.buffer);
      
      const fileId = await new Promise((resolve, reject) => {
        uploadStream.on('finish', () => {
          console.log("✅ Design file uploaded to GridFS:", uploadStream.id);
          resolve(uploadStream.id);
        });
        uploadStream.on('error', (error) => {
          console.error('GridFS upload error:', error);
          reject(error);
        });
      });

      // Handle thumbnail
      let thumbnailData = customization.originalImage;
      let thumbnailFileId = null;
      
      if (thumbnailFile) {
        // Upload thumbnail file to GridFS
        console.log("✅ Using uploaded thumbnail file");
        const thumbnailStream = bucket.openUploadStream(
          `thumbnail_${Date.now()}_${user._id}.png`,
          { 
            contentType: 'image/png',
            metadata: {
              userId: user._id.toString(),
              type: 'thumbnail',
              timestamp: new Date()
            }
          }
        );
        
        thumbnailStream.end(thumbnailFile.buffer);
        
        thumbnailFileId = await new Promise((resolve, reject) => {
          thumbnailStream.on('finish', () => {
            console.log("✅ Thumbnail uploaded to GridFS:", thumbnailStream.id);
            resolve(thumbnailStream.id);
          });
          thumbnailStream.on('error', reject);
        });
        
        // Use file URL for thumbnail
        thumbnailData = `${req.protocol}://${req.get('host')}/api/saved-designs/${user._id}/thumbnail/${thumbnailFileId}`;
      } else if (customization.originalImage && customization.originalImage.startsWith('data:image/')) {
        // Use base64 image from customization
        console.log("✅ Using originalImage from customization as thumbnail");
        thumbnailData = customization.originalImage;
      }

      // Create saved design
      const savedDesign = await SavedDesign.create({
        user: user._id,
        store: storeId,
        name: name || `My ${productType} Design`,
        productType,
        color,
        designFile: {
          fileId,
          filename: designFile.originalname,
          mimeType: designFile.mimetype,
          size: designFile.size
        },
        customization: {
          ...customization,
          // Ensure originalImage is preserved
          originalImage: customization.originalImage || thumbnailData
        },
        thumbnail: thumbnailData,
        tags: tags || []
      });

      // Populate store info
      const populatedDesign = await SavedDesign.findById(savedDesign._id)
        .populate('store', 'name logoFileId');

      console.log("✅ Design saved successfully:", {
        id: savedDesign._id,
        name: savedDesign.name,
        productType: savedDesign.productType,
        hasThumbnail: !!savedDesign.thumbnail,
        hasCustomization: !!savedDesign.customization,
        hasOriginalImage: !!savedDesign.customization?.originalImage
      });

      res.status(201).json(populatedDesign);
      
    } catch (dbError) {
      console.error('Database error:', dbError);
      res.status(500).json({ 
        message: 'Database error saving design',
        error: dbError.message 
      });
    }
  } catch (error) {
    console.error('❌ Error saving design:', error);
    res.status(500).json({ 
      message: 'Failed to save design',
      error: error.message
    });
  }
};

// Get user's saved designs
exports.getMyDesigns = async (req, res) => {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const designs = await SavedDesign.find({ 
      user: user._id,
      isActive: true 
    })
    .populate('store', 'name logoFileId')
    .sort({ createdAt: -1 });

    // Process designs for frontend
    const designsWithProcessedThumbnails = designs.map(design => {
      const designObj = design.toObject();
      
      // Ensure customization has originalImage
      if (designObj.customization && !designObj.customization.originalImage && designObj.thumbnail) {
        designObj.customization.originalImage = designObj.thumbnail;
      }
      
      return designObj;
    });

    res.json(designsWithProcessedThumbnails);
  } catch (error) {
    console.error('Error fetching designs:', error);
    res.status(500).json({ message: error.message });
  }
};

// Get thumbnail image
exports.getThumbnail = async (req, res) => {
  try {
    const { userId, fileId } = req.params;
    
    // Verify the thumbnail belongs to the user's designs
    const design = await SavedDesign.findOne({
      'user': userId,
      $or: [
        { 'thumbnail': fileId },
        { 'designFile.fileId': fileId }
      ]
    });
    
    if (!design) {
      return res.status(404).json({ message: 'Thumbnail not found' });
    }

    const db = mongoose.connection.db;
    if (!db) {
      return res.status(500).json({ message: 'Database connection error' });
    }

    const bucket = new mongoose.mongo.GridFSBucket(db, { 
      bucketName: 'uploads' 
    });

    res.set('Content-Type', 'image/png');
    
    try {
      const stream = bucket.openDownloadStream(
        new mongoose.Types.ObjectId(fileId)
      );
      
      stream.pipe(res);
      stream.on('error', () => {
        res.status(404).json({ message: 'Thumbnail file not found' });
      });
    } catch (streamError) {
      res.status(404).json({ message: 'Thumbnail file not found' });
    }
  } catch (error) {
    console.error('Error fetching thumbnail:', error);
    res.status(500).json({ message: error.message });
  }
};

// Get single design
exports.getDesignById = async (req, res) => {
  try {
    const { id } = req.params;
    const user = req.user;

    const design = await SavedDesign.findOne({
      _id: id,
      user: user._id,
      isActive: true
    }).populate('store', 'name logoFileId');

    if (!design) {
      return res.status(404).json({ message: 'Design not found' });
    }

    // Ensure originalImage exists
    const designObj = design.toObject();
    if (designObj.customization && !designObj.customization.originalImage && designObj.thumbnail) {
      designObj.customization.originalImage = designObj.thumbnail;
    }

    // Increment view count
    design.viewCount += 1;
    design.lastViewedAt = new Date();
    await design.save();

    res.json(designObj);
  } catch (error) {
    console.error('Error fetching design:', error);
    res.status(500).json({ message: error.message });
  }
};

// Update design (name, tags, etc.)
exports.updateDesign = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, tags } = req.body;
    const user = req.user;

    const design = await SavedDesign.findOne({
      _id: id,
      user: user._id
    });

    if (!design) {
      return res.status(404).json({ message: 'Design not found' });
    }

    // Update allowed fields
    if (name !== undefined) design.name = name;
    if (tags !== undefined) design.tags = tags;

    await design.save();
    
    const populatedDesign = await SavedDesign.findById(design._id)
      .populate('store', 'name logoFileId');
      
    res.json(populatedDesign);
  } catch (error) {
    console.error('Error updating design:', error);
    res.status(500).json({ message: error.message });
  }
};

// Delete (soft delete) design
exports.deleteDesign = async (req, res) => {
  try {
    const { id } = req.params;
    const user = req.user;

    const design = await SavedDesign.findOne({
      _id: id,
      user: user._id
    });

    if (!design) {
      return res.status(404).json({ message: 'Design not found' });
    }

    // Soft delete
    design.isActive = false;
    await design.save();

    res.json({ message: 'Design deleted successfully' });
  } catch (error) {
    console.error('Error deleting design:', error);
    res.status(500).json({ message: error.message });
  }
};

// Download design image
exports.downloadDesignImage = async (req, res) => {
  try {
    const { id } = req.params;
    const user = req.user;

    const design = await SavedDesign.findOne({
      _id: id,
      user: user._id,
      isActive: true
    });

    if (!design || !design.designFile.fileId) {
      return res.status(404).json({ message: 'Design or image not found' });
    }

    const db = mongoose.connection.db;
    if (!db) {
      return res.status(500).json({ message: 'Database connection error' });
    }

    const bucket = new mongoose.mongo.GridFSBucket(db, { 
      bucketName: 'uploads' 
    });

    res.set('Content-Type', design.designFile.mimeType || 'image/png');
    res.set('Content-Disposition', `attachment; filename="${design.designFile.filename || 'design.png'}"`);
    
    const stream = bucket.openDownloadStream(
      new mongoose.Types.ObjectId(design.designFile.fileId)
    );
    
    stream.pipe(res);
    stream.on('error', () => res.status(500).end());
  } catch (error) {
    console.error('Error downloading design image:', error);
    res.status(500).json({ message: error.message });
  }
};

// Convert saved design to order
exports.convertToOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const { serviceId, quantity, notes } = req.body;
    const user = req.user;

    // Get the saved design
    const design = await SavedDesign.findOne({
      _id: id,
      user: user._id,
      isActive: true
    });

    if (!design) {
      return res.status(404).json({ message: 'Design not found' });
    }

    res.json({ 
      message: 'Design ready to be converted to order',
      designId: design._id,
      productType: design.productType,
      color: design.color,
      storeId: design.store,
      designFile: design.designFile
    });
  } catch (error) {
    console.error('Error converting design to order:', error);
    res.status(500).json({ message: error.message });
  }
};