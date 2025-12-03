const mongoose = require('mongoose');
const SavedDesign = require('../models/savedDesignModel');

// Helper function to upload file to GridFS
const uploadToGridFS = async (db, fileBuffer, filename, metadata, contentType = 'image/png') => {
  const bucket = new mongoose.mongo.GridFSBucket(db, { 
    bucketName: 'uploads' 
  });

  return new Promise((resolve, reject) => {
    const uploadStream = bucket.openUploadStream(filename, { 
      contentType,
      metadata: {
        ...metadata,
        timestamp: new Date()
      }
    });

    uploadStream.end(fileBuffer);
    
    uploadStream.on('finish', () => {
      console.log("✅ File uploaded to GridFS:", uploadStream.id);
      resolve(uploadStream.id);
    });
    
    uploadStream.on('error', (error) => {
      console.error('GridFS upload error:', error);
      reject(error);
    });
  });
};

// Helper to convert data URL to buffer
const dataURLToBuffer = (dataURL) => {
  const matches = dataURL.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
  
  if (!matches || matches.length !== 3) {
    throw new Error('Invalid data URL format');
  }
  
  return {
    buffer: Buffer.from(matches[2], 'base64'),
    mimeType: matches[1]
  };
};

// Save a design
exports.saveDesign = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  
  let designFileId = null;
  let thumbnailFileId = null;
  
  try {
    console.log("🔍 Received save design request");

    // Get user
    const user = req.user;
    if (!user) {
      await session.abortTransaction();
      session.endSession();
      return res.status(401).json({ message: 'Authentication required' });
    }

    // Parse required fields
    const { productType, color, name, storeId } = req.body;
    
    // Parse JSON fields
    let customization = {};
    let tags = [];
    
    try {
      if (req.body.customization) {
        customization = typeof req.body.customization === 'string' 
          ? JSON.parse(req.body.customization) 
          : req.body.customization;
      }
      
      if (req.body.tags) {
        tags = typeof req.body.tags === 'string' 
          ? JSON.parse(req.body.tags) 
          : req.body.tags;
      }
    } catch (parseError) {
      console.error('Error parsing JSON fields:', parseError);
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ 
        message: 'Invalid JSON format in customization or tags',
        error: parseError.message 
      });
    }

    // Validate required fields
    if (!productType || !color || !storeId) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ 
        message: 'productType, color, and storeId are required' 
      });
    }

    // Check for design file upload
    if (!req.files || !req.files.designFile || req.files.designFile.length === 0) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ 
        message: 'Design image is required' 
      });
    }

    const designFile = req.files.designFile[0];
    const thumbnailFile = req.files.thumbnail ? req.files.thumbnail[0] : null;

    // Handle database connection
    const db = mongoose.connection.db;
    if (!db) {
      await session.abortTransaction();
      session.endSession();
      return res.status(500).json({ 
        message: 'Database connection error' 
      });
    }

    try {
      // 1. Upload main design file to GridFS
      designFileId = await uploadToGridFS(
        db,
        designFile.buffer,
        designFile.originalname,
        {
          userId: user._id.toString(),
          type: 'design',
          originalFilename: designFile.originalname
        },
        designFile.mimetype
      );

      // 2. Handle thumbnail - preserve data URL in customization
      let originalImageDataURL = null;
      
      if (thumbnailFile) {
        // Upload thumbnail file to GridFS
        thumbnailFileId = await uploadToGridFS(
          db,
          thumbnailFile.buffer,
          `thumbnail_${Date.now()}_${user._id}.png`,
          {
            userId: user._id.toString(),
            type: 'thumbnail',
            source: 'uploaded_file'
          }
        );
      } else if (customization.originalImage && customization.originalImage.startsWith('data:image/')) {
        // Save the data URL for 3D preview recreation
        originalImageDataURL = customization.originalImage;
        
        try {
          // Also upload to GridFS for thumbnail display
          const { buffer, mimeType } = dataURLToBuffer(customization.originalImage);
          thumbnailFileId = await uploadToGridFS(
            db,
            buffer,
            `thumbnail_${Date.now()}_${user._id}_from_data.png`,
            {
              userId: user._id.toString(),
              type: 'thumbnail',
              source: 'customization_data_url'
            },
            mimeType
          );
        } catch (dataUrlError) {
          console.error('Error processing data URL for thumbnail:', dataUrlError);
          // Continue without thumbnail, but keep the data URL
        }
      }

      // 3. Create saved design - keep data URL in customization
      const savedDesign = await SavedDesign.create([{
        user: user._id,
        store: storeId,
        name: name || `My ${productType} Design`,
        productType,
        color,
        designFile: {
          fileId: designFileId,
          filename: designFile.originalname,
          mimeType: designFile.mimetype,
          size: designFile.size
        },
        // Preserve the data URL in customization for 3D preview
        customization: {
          ...customization,
          originalImage: originalImageDataURL || customization.originalImage
        },
        thumbnail: thumbnailFileId, // ONLY ObjectId or null
        tags: tags || []
      }], { session });

      await session.commitTransaction();
      session.endSession();

      // 4. Populate and add full URLs WITH /api/ PREFIX
      const populatedDesign = await SavedDesign.findById(savedDesign[0]._id)
        .populate('store', 'name logoFileId')
        .lean({ virtuals: true });

      // Convert virtual URLs to full URLs WITH /api/ PREFIX
      const designWithUrls = {
        ...populatedDesign,
        thumbnailUrl: populatedDesign.thumbnailUrl 
          ? `${req.protocol}://${req.get('host')}/api${populatedDesign.thumbnailUrl}`
          : null,
        designUrl: populatedDesign.designUrl
          ? `${req.protocol}://${req.get('host')}/api${populatedDesign.designUrl}`
          : null,
        originalImageUrl: populatedDesign.originalImageUrl
          ? (populatedDesign.originalImageUrl.startsWith('http') 
              ? populatedDesign.originalImageUrl 
              : `${req.protocol}://${req.get('host')}/api${populatedDesign.originalImageUrl}`)
          : null
      };

      console.log("✅ Design saved successfully:", {
        id: savedDesign[0]._id,
        name: savedDesign[0].name,
        productType: savedDesign[0].productType,
        hasOriginalImage: !!originalImageDataURL,
        thumbnailUrl: designWithUrls.thumbnailUrl?.substring(0, 50)
      });

      res.status(201).json(designWithUrls);
      
    } catch (dbError) {
      await session.abortTransaction();
      session.endSession();
      
      // Cleanup: Delete any uploaded files if transaction failed
      try {
        const bucket = new mongoose.mongo.GridFSBucket(db, { bucketName: 'uploads' });
        if (designFileId) {
          await bucket.delete(designFileId);
        }
        if (thumbnailFileId) {
          await bucket.delete(thumbnailFileId);
        }
      } catch (cleanupError) {
        console.error('Cleanup error:', cleanupError);
      }
      
      console.error('Database error:', dbError);
      res.status(500).json({ 
        message: 'Database error saving design',
        error: dbError.message 
      });
    }
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    
    console.error('❌ Error saving design:', error);
    res.status(500).json({ 
      message: 'Failed to save design',
      error: error.message
    });
  }
};

// Get user's saved designs - WITH /api/ PREFIX
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
    .sort({ createdAt: -1 })
    .lean({ virtuals: true });

    // Convert relative URLs to full URLs WITH /api/ PREFIX
    const designsWithUrls = designs.map(design => {
      const designObj = { ...design };
      
      // Add full URLs for virtuals WITH /api/ PREFIX
      if (designObj.thumbnailUrl && !designObj.thumbnailUrl.startsWith('http')) {
        designObj.thumbnailUrl = `${req.protocol}://${req.get('host')}/api${designObj.thumbnailUrl}`;
      }
      
      if (designObj.designUrl && !designObj.designUrl.startsWith('http')) {
        designObj.designUrl = `${req.protocol}://${req.get('host')}/api${designObj.designUrl}`;
      }
      
      if (designObj.originalImageUrl && !designObj.originalImageUrl.startsWith('http')) {
        designObj.originalImageUrl = `${req.protocol}://${req.get('host')}/api${designObj.originalImageUrl}`;
      }
      
      // For backward compatibility: ensure customization.originalImage exists
      if (!designObj.customization?.originalImage) {
        if (!designObj.customization) designObj.customization = {};
        // Use the data URL if we have it in the database, otherwise use the URL
        if (designObj.originalImageUrl && designObj.originalImageUrl.startsWith('http')) {
          designObj.customization.originalImage = designObj.originalImageUrl;
        }
      }
      
      return designObj;
    });

    res.json(designsWithUrls);
  } catch (error) {
    console.error('Error fetching designs:', error);
    res.status(500).json({ message: error.message });
  }
};

// Get thumbnail image - NO AUTH REQUIRED (for public access)
exports.getThumbnail = async (req, res) => {
  try {
    const { userId, thumbnailId } = req.params;
    
    console.log("🔍 Fetching thumbnail:", { userId, thumbnailId });
    
    // Check if it's a MongoDB ObjectId
    if (!mongoose.Types.ObjectId.isValid(thumbnailId)) {
      console.log('🔄 Not an ObjectId, might be a data URL or other ID');
      
      // Check if it's a design ID (for /api/saved-designs/:id/image)
      if (thumbnailId && thumbnailId.length === 24) { // MongoDB ID length
        // Try to find design by ID and use its image
        const design = await SavedDesign.findOne({ _id: thumbnailId, isActive: true });
        if (design && design.customization?.originalImage && design.customization.originalImage.startsWith('data:image/')) {
          console.log('✅ Serving thumbnail from design data URL');
          const base64Data = design.customization.originalImage.split(',')[1];
          const imgBuffer = Buffer.from(base64Data, 'base64');
          res.set('Content-Type', 'image/png');
          res.set('Cache-Control', 'public, max-age=31536000');
          res.set('Access-Control-Allow-Origin', '*');
          return res.send(imgBuffer);
        }
      }
      
      console.error('❌ Invalid thumbnail ID:', thumbnailId);
      return res.status(400).json({ message: 'Invalid thumbnail ID' });
    }

    const db = mongoose.connection.db;
    if (!db) {
      return res.status(500).json({ message: 'Database connection error' });
    }

    const bucket = new mongoose.mongo.GridFSBucket(db, { 
      bucketName: 'uploads' 
    });

    // Try to get file info first to determine content type
    const files = await bucket.find({ _id: new mongoose.Types.ObjectId(thumbnailId) }).toArray();
    
    if (!files || files.length === 0) {
      console.error('❌ Thumbnail file not found:', thumbnailId);
      // Return a simple placeholder image
      const fallbackImage = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 'base64');
      res.set('Content-Type', 'image/png');
      res.set('Cache-Control', 'public, max-age=3600');
      res.set('Access-Control-Allow-Origin', '*');
      return res.send(fallbackImage);
    }

    const file = files[0];
    res.set('Content-Type', file.contentType || 'image/png');
    res.set('Cache-Control', 'public, max-age=31536000');
    res.set('Access-Control-Allow-Origin', '*');
    
    try {
      const stream = bucket.openDownloadStream(new mongoose.Types.ObjectId(thumbnailId));
      stream.pipe(res);
      stream.on('error', (error) => {
        console.error('❌ Stream error:', error);
        // Return a fallback image
        const fallbackImage = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 'base64');
        res.send(fallbackImage);
      });
    } catch (streamError) {
      console.error('❌ Stream creation error:', streamError);
      const fallbackImage = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 'base64');
      res.send(fallbackImage);
    }
  } catch (error) {
    console.error('❌ Error fetching thumbnail:', error);
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
    }).populate('store', 'name logoFileId').lean({ virtuals: true });

    if (!design) {
      return res.status(404).json({ message: 'Design not found' });
    }

    // Convert relative URLs to full URLs WITH /api/ PREFIX
    const designWithUrls = {
      ...design,
      thumbnailUrl: design.thumbnailUrl 
        ? `${req.protocol}://${req.get('host')}/api${design.thumbnailUrl}`
        : null,
      designUrl: design.designUrl
        ? `${req.protocol}://${req.get('host')}/api${design.designUrl}`
        : null,
      originalImageUrl: design.originalImageUrl
        ? (design.originalImageUrl.startsWith('http') 
            ? design.originalImageUrl 
            : `${req.protocol}://${req.get('host')}/api${design.originalImageUrl}`)
        : null
    };

    // For backward compatibility
    if (!designWithUrls.customization?.originalImage) {
      if (!designWithUrls.customization) designWithUrls.customization = {};
      if (designWithUrls.originalImageUrl && designWithUrls.originalImageUrl.startsWith('http')) {
        designWithUrls.customization.originalImage = designWithUrls.originalImageUrl;
      }
    }

    // Increment view count (async, don't wait for it)
    SavedDesign.updateOne(
      { _id: id, user: user._id },
      { 
        $inc: { viewCount: 1 },
        $set: { lastViewedAt: new Date() }
      }
    ).catch(err => console.error('Error updating view count:', err));

    res.json(designWithUrls);
  } catch (error) {
    console.error('Error fetching design:', error);
    res.status(500).json({ message: error.message });
  }
};

// Update design
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
      .populate('store', 'name logoFileId')
      .lean({ virtuals: true });
    
    // Convert virtual URLs to full URLs WITH /api/ PREFIX
    const designWithUrls = {
      ...populatedDesign,
      thumbnailUrl: populatedDesign.thumbnailUrl 
        ? `${req.protocol}://${req.get('host')}/api${populatedDesign.thumbnailUrl}`
        : null,
      designUrl: populatedDesign.designUrl
        ? `${req.protocol}://${req.get('host')}/api${populatedDesign.designUrl}`
        : null,
      originalImageUrl: populatedDesign.originalImageUrl
        ? (populatedDesign.originalImageUrl.startsWith('http') 
            ? populatedDesign.originalImageUrl 
            : `${req.protocol}://${req.get('host')}/api${populatedDesign.originalImageUrl}`)
        : null
    };
      
    res.json(designWithUrls);
  } catch (error) {
    console.error('Error updating design:', error);
    res.status(500).json({ message: error.message });
  }
};

// Delete design
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

// Download design image - NO AUTH REQUIRED (for public image access)
exports.downloadDesignImage = async (req, res) => {
  try {
    const { id } = req.params;
    
    console.log("📥 Download design image requested for ID:", id);

    const design = await SavedDesign.findOne({
      _id: id,
      isActive: true
    });

    if (!design) {
      console.log("❌ Design not found:", id);
      return res.status(404).json({ message: 'Design not found' });
    }

    if (!design.designFile || !design.designFile.fileId) {
      console.log("❌ Design has no file:", id);
      return res.status(404).json({ message: 'Design image not found' });
    }

    // CHECK: Does the design have originalImage data URL? Use it!
    if (design.customization?.originalImage && design.customization.originalImage.startsWith('data:image/')) {
      console.log("✅ Serving image from data URL for design:", design.name);
      
      try {
        const base64Data = design.customization.originalImage.split(',')[1];
        const imgBuffer = Buffer.from(base64Data, 'base64');
        
        // Determine content type from data URL
        const matches = design.customization.originalImage.match(/^data:(image\/\w+);base64,/);
        const contentType = matches ? matches[1] : 'image/png';
        
        res.set('Content-Type', contentType);
        res.set('Content-Length', imgBuffer.length);
        res.set('Cache-Control', 'public, max-age=31536000');
        res.set('Access-Control-Allow-Origin', '*');
        
        console.log("✅ Serving data URL image, size:", imgBuffer.length, "bytes");
        return res.send(imgBuffer);
      } catch (dataUrlError) {
        console.error("❌ Error processing data URL:", dataUrlError);
        // Fall through to GridFS
      }
    }

    // Try GridFS
    const db = mongoose.connection.db;
    if (!db) {
      console.error("❌ Database connection error");
      return res.status(500).json({ message: 'Database connection error' });
    }

    const bucket = new mongoose.mongo.GridFSBucket(db, { 
      bucketName: 'uploads' 
    });

    // Check if file exists in GridFS
    const files = await bucket.find({ _id: design.designFile.fileId }).toArray();
    if (!files || files.length === 0) {
      console.error("❌ File not found in GridFS:", design.designFile.fileId);
      return res.status(404).json({ message: 'Image file not found in storage' });
    }

    const file = files[0];
    console.log("✅ Found file in GridFS:", {
      filename: file.filename,
      length: file.length,
      contentType: file.contentType
    });

    res.set('Content-Type', file?.contentType || design.designFile.mimeType || 'image/png');
    res.set('Content-Length', file.length);
    res.set('Content-Disposition', `inline; filename="${design.designFile.filename || 'design.png'}"`);
    res.set('Cache-Control', 'public, max-age=31536000');
    res.set('Access-Control-Allow-Origin', '*');
    
    const stream = bucket.openDownloadStream(design.designFile.fileId);
    stream.pipe(res);
    
    stream.on('error', (error) => {
      console.error('❌ Stream error:', error);
      // Return a simple fallback
      const fallbackImage = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 'base64');
      res.set('Content-Type', 'image/png');
      res.send(fallbackImage);
    });
    
  } catch (error) {
    console.error('❌ Error downloading design image:', error);
    res.status(500).json({ message: error.message });
  }
};

// Convert saved design to order
exports.convertToOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const { serviceId, quantity, notes } = req.body;
    const user = req.user;

    const design = await SavedDesign.findOne({
      _id: id,
      user: user._id,
      isActive: true
    }).populate('store', 'name');

    if (!design) {
      return res.status(404).json({ message: 'Design not found' });
    }

    res.json({ 
      message: 'Design ready to be converted to order',
      designId: design._id,
      productType: design.productType,
      color: design.color,
      storeId: design.store._id,
      storeName: design.store.name,
      designFile: design.designFile
    });
  } catch (error) {
    console.error('Error converting design to order:', error);
    res.status(500).json({ message: error.message });
  }
};