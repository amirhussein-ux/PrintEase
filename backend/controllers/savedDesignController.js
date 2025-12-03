const mongoose = require('mongoose');
const SavedDesign = require('../models/savedDesignModel');

// Save a design - SIMPLIFIED AND FIXED
exports.saveDesign = async (req, res) => {
  try {
    console.log("🔍 Received save design request");

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
      return res.status(400).json({ 
        message: 'productType, color, and storeId are required' 
      });
    }

    // Check for design file upload
    if (!req.files || !req.files.designFile || req.files.designFile.length === 0) {
      return res.status(400).json({ 
        message: 'Design image is required' 
      });
    }

    const designFile = req.files.designFile[0];
    const thumbnailFile = req.files.thumbnail ? req.files.thumbnail[0] : null;

    // Handle database connection
    const db = mongoose.connection.db;
    if (!db) {
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

      // Handle thumbnail - SIMPLE VERSION
      let thumbnailData = null;
      
      if (thumbnailFile) {
        // Upload thumbnail file to GridFS
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
        
        thumbnailData = await new Promise((resolve, reject) => {
          thumbnailStream.on('finish', () => {
            console.log("✅ Thumbnail uploaded to GridFS:", thumbnailStream.id);
            resolve(thumbnailStream.id);
          });
          thumbnailStream.on('error', reject);
        });
      } else if (customization.originalImage && customization.originalImage.startsWith('data:image/')) {
        // Store as data URL directly
        console.log("✅ Using originalImage from customization as thumbnail (data URL)");
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
        customization: customization,
        thumbnail: thumbnailData,
        tags: tags || []
      });

      // Populate store info
      const populatedDesign = await SavedDesign.findById(savedDesign._id)
        .populate('store', 'name logoFileId')
        .lean();

      // Generate URLs
      const designWithUrls = {
        ...populatedDesign,
        thumbnailUrl: thumbnailData ? 
          (typeof thumbnailData === 'string' && thumbnailData.startsWith('data:image/') ? 
            thumbnailData : 
            `${req.protocol}://${req.get('host')}/api/saved-designs/${user._id}/thumbnail/${thumbnailData}`) : 
          null,
        designUrl: `${req.protocol}://${req.get('host')}/api/saved-designs/${savedDesign._id}/image`
      };

      console.log("✅ Design saved successfully:", {
        id: savedDesign._id,
        name: savedDesign.name,
        productType: savedDesign.productType
      });

      res.status(201).json(designWithUrls);
      
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

// Get user's saved designs - SIMPLIFIED
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
    .lean();

    // Process designs with proper URLs
    const designsWithUrls = designs.map(design => {
      const designObj = { ...design };
      
      // Generate thumbnail URL
      if (designObj.thumbnail) {
        if (typeof designObj.thumbnail === 'string' && designObj.thumbnail.startsWith('data:image/')) {
          designObj.thumbnailUrl = designObj.thumbnail;
        } else if (mongoose.Types.ObjectId.isValid(designObj.thumbnail)) {
          designObj.thumbnailUrl = `${req.protocol}://${req.get('host')}/api/saved-designs/${designObj.user}/thumbnail/${designObj.thumbnail}`;
        }
      }
      
      // Generate design URL
      if (designObj.designFile?.fileId) {
        designObj.designUrl = `${req.protocol}://${req.get('host')}/api/saved-designs/${designObj._id}/image`;
      }
      
      return designObj;
    });

    res.json(designsWithUrls);
  } catch (error) {
    console.error('Error fetching designs:', error);
    res.status(500).json({ message: error.message });
  }
};

// Get thumbnail image - SIMPLIFIED
exports.getThumbnail = async (req, res) => {
  try {
    const { userId, thumbnailId } = req.params;
    
    console.log("🔍 Fetching thumbnail:", { userId, thumbnailId });
    
    // Check if it's a data URL
    if (typeof thumbnailId === 'string' && thumbnailId.startsWith('data:image/')) {
      // Extract base64 data
      const base64Data = thumbnailId.split(',')[1];
      if (!base64Data) {
        return res.status(400).json({ message: 'Invalid data URL' });
      }
      
      // Convert base64 to buffer
      const buffer = Buffer.from(base64Data, 'base64');
      res.set('Content-Type', 'image/png');
      res.send(buffer);
      return;
    }
    
    // Check if it's a MongoDB ObjectId
    if (!mongoose.Types.ObjectId.isValid(thumbnailId)) {
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

    res.set('Content-Type', 'image/png');
    
    try {
      const stream = bucket.openDownloadStream(
        new mongoose.Types.ObjectId(thumbnailId)
      );
      
      stream.pipe(res);
      stream.on('error', (error) => {
        console.error('❌ Stream error:', error);
        // Return a fallback image
        const fallbackImage = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 'base64');
        res.send(fallbackImage);
      });
    } catch (streamError) {
      console.error('❌ Stream creation error:', streamError);
      // Return a fallback image
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
    }).populate('store', 'name logoFileId').lean();

    if (!design) {
      return res.status(404).json({ message: 'Design not found' });
    }

    // Add URL properties
    const designWithUrls = { ...design };
    
    // Generate thumbnail URL
    if (designWithUrls.thumbnail) {
      if (typeof designWithUrls.thumbnail === 'string' && designWithUrls.thumbnail.startsWith('data:image/')) {
        designWithUrls.thumbnailUrl = designWithUrls.thumbnail;
      } else if (mongoose.Types.ObjectId.isValid(designWithUrls.thumbnail)) {
        designWithUrls.thumbnailUrl = `${req.protocol}://${req.get('host')}/api/saved-designs/${designWithUrls.user}/thumbnail/${designWithUrls.thumbnail}`;
      }
    }
    
    // Generate design URL
    if (designWithUrls.designFile?.fileId) {
      designWithUrls.designUrl = `${req.protocol}://${req.get('host')}/api/saved-designs/${designWithUrls._id}/image`;
    }

    // Increment view count
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
      .lean();
    
    // Add URL properties
    const designWithUrls = {
      ...populatedDesign,
      thumbnailUrl: design.thumbnail ? 
        (typeof design.thumbnail === 'string' && design.thumbnail.startsWith('data:image/') ? 
          design.thumbnail : 
          `${req.protocol}://${req.get('host')}/api/saved-designs/${design.user}/thumbnail/${design.thumbnail}`) : 
        null,
      designUrl: `${req.protocol}://${req.get('host')}/api/saved-designs/${design._id}/image`
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