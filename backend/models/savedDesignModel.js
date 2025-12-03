const mongoose = require('mongoose');

const savedDesignSchema = new mongoose.Schema({
  user: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true,
    index: true
  },
  store: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'PrintStore', 
    required: true,
    index: true
  },
  name: { 
    type: String, 
    default: 'My Design',
    trim: true,
    maxlength: 100
  },
  productType: { 
    type: String, 
    required: true,
    enum: ['Mug', 'T-Shirt', 'Mousepad', 'Sticker', 'Phone Case'],
    index: true
  },
  color: { 
    type: String, 
    required: true,
    trim: true
  },
  
  // File reference
  designFile: {
    fileId: { 
      type: mongoose.Schema.Types.ObjectId, 
      required: true 
    },
    filename: { 
      type: String,
      trim: true
    },
    mimeType: { 
      type: String,
      enum: ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/gif']
    },
    size: { 
      type: Number,
      min: 1,
      max: 10 * 1024 * 1024 // 10MB max
    }
  },
  
  // Customization data
  customization: {
    position: { 
      x: { 
        type: Number, 
        default: 0.5,
        min: 0,
        max: 1
      },
      y: { 
        type: Number, 
        default: 0.5,
        min: 0,
        max: 1
      }
    },
    scale: { 
      type: Number, 
      default: 1,
      min: 0.1,
      max: 10
    },
    rotation: { 
      type: Number, 
      default: 0,
      min: -360,
      max: 360
    },
    
    // 3D product specific
    decalPosition3D: {
      x: { type: Number },
      y: { type: Number },
      z: { type: Number }
    },
    
    // 2D product specific
    productDimensions: {
      width: { 
        type: Number,
        min: 1,
        max: 1000
      },
      height: { 
        type: Number,
        min: 1,
        max: 1000
      }
    },
    
    // Store original uploaded image as URL string
    originalImage: { 
      type: String,
      trim: true
    }
  },
  
  // Thumbnail reference - ONLY ObjectId or null
  thumbnail: { 
    type: mongoose.Schema.Types.ObjectId,
    default: null
  },
  
  tags: [{ 
    type: String,
    trim: true,
    lowercase: true
  }],
  isActive: { 
    type: Boolean, 
    default: true,
    index: true
  },
  
  // Statistics
  viewCount: { 
    type: Number, 
    default: 0,
    min: 0
  },
  lastViewedAt: { 
    type: Date 
  },
  
  // Timestamps
  createdAt: { 
    type: Date, 
    default: Date.now,
    index: true
  },
  updatedAt: { 
    type: Date, 
    default: Date.now 
  }
}, {
  toJSON: { 
    virtuals: true,
    transform: function(doc, ret) {
      // Add virtual fields
      ret.thumbnailUrl = doc.thumbnailUrl;
      ret.designUrl = doc.designUrl;
      ret.originalImageUrl = doc.originalImageUrl;
      ret.is3DProduct = doc.is3DProduct;
      ret.is2DProduct = doc.is2DProduct;
      delete ret.__v;
      return ret;
    }
  },
  toObject: { 
    virtuals: true,
    transform: function(doc, ret) {
      ret.thumbnailUrl = doc.thumbnailUrl;
      ret.designUrl = doc.designUrl;
      ret.originalImageUrl = doc.originalImageUrl;
      ret.is3DProduct = doc.is3DProduct;
      ret.is2DProduct = doc.is2DProduct;
      delete ret.__v;
      return ret;
    }
  },
  timestamps: false
});

// Virtual for thumbnail URL - CHANGED: Removed /api/ prefix
savedDesignSchema.virtual('thumbnailUrl').get(function() {
  if (!this.thumbnail) return null;
  
  // Convert to string and check if it's a valid ObjectId
  const thumbnailStr = this.thumbnail.toString();
  
  if (mongoose.Types.ObjectId.isValid(thumbnailStr)) {
    // Return path without /api/ since routes already handle it
    return `/saved-designs/${this.user}/thumbnail/${thumbnailStr}`;
  }
  
  return null;
});

// Virtual for design URL - CHANGED: Removed /api/ prefix
savedDesignSchema.virtual('designUrl').get(function() {
  if (this.designFile?.fileId) {
    return `/saved-designs/${this._id}/image`;
  }
  return null;
});

// Virtual for original image - RENAMED to avoid conflict
savedDesignSchema.virtual('originalImageUrl').get(function() {
  // Return stored originalImage or fall back to thumbnail
  return this.customization?.originalImage || this.thumbnailUrl;
});

// FIXED: Correct 3D/2D product logic
savedDesignSchema.virtual('is3DProduct').get(function() {
  return ['Mug'].includes(this.productType); // Only Mug is truly 3D
});

savedDesignSchema.virtual('is2DProduct').get(function() {
  return ['T-Shirt', 'Mousepad', 'Sticker', 'Phone Case'].includes(this.productType);
});

// Update timestamps
savedDesignSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  
  // Clean up tags
  if (this.tags && Array.isArray(this.tags)) {
    this.tags = this.tags
      .filter(tag => tag && typeof tag === 'string')
      .map(tag => tag.trim().toLowerCase())
      .filter((tag, index, arr) => arr.indexOf(tag) === index);
  }
  
  next();
});

// Create compound indexes
savedDesignSchema.index({ user: 1, isActive: 1, createdAt: -1 });
savedDesignSchema.index({ store: 1, isActive: 1, createdAt: -1 });
savedDesignSchema.index({ productType: 1, isActive: 1 });
savedDesignSchema.index({ tags: 1 });

// Static method to find designs by user with proper URLs
savedDesignSchema.statics.findByUserWithUrls = async function(userId, options = {}, req = null) {
  const query = {
    user: userId,
    isActive: options.active !== false
  };
  
  if (options.productType) {
    query.productType = options.productType;
  }
  
  if (options.storeId) {
    query.store = options.storeId;
  }
  
  const designs = await this.find(query)
    .populate('store', 'name logoFileId')
    .sort({ createdAt: -1 })
    .limit(options.limit || 100)
    .lean({ virtuals: true });
  
  // Convert relative URLs to full URLs if request object is provided
  if (req) {
    return designs.map(design => {
      const designObj = design;
      
      // Convert thumbnailUrl to full URL
      if (designObj.thumbnailUrl && !designObj.thumbnailUrl.startsWith('http')) {
        designObj.thumbnailUrl = `${req.protocol}://${req.get('host')}${designObj.thumbnailUrl}`;
      }
      
      // Convert designUrl to full URL
      if (designObj.designUrl && !designObj.designUrl.startsWith('http')) {
        designObj.designUrl = `${req.protocol}://${req.get('host')}${designObj.designUrl}`;
      }
      
      return designObj;
    });
  }
  
  return designs;
};

// Static method to increment view count
savedDesignSchema.statics.incrementViewCount = async function(designId, userId) {
  return this.findOneAndUpdate(
    { 
      _id: designId,
      user: userId 
    },
    { 
      $inc: { viewCount: 1 },
      $set: { lastViewedAt: new Date() }
    },
    { new: true }
  );
};

// Instance method to get public data
savedDesignSchema.methods.getPublicData = function(req = null) {
  const data = {
    _id: this._id,
    name: this.name,
    productType: this.productType,
    color: this.color,
    thumbnailUrl: this.thumbnailUrl,
    designUrl: this.designUrl,
    originalImageUrl: this.originalImageUrl,
    customization: {
      position: this.customization?.position,
      scale: this.customization?.scale,
      rotation: this.customization?.rotation
    },
    tags: this.tags,
    viewCount: this.viewCount,
    createdAt: this.createdAt,
    store: this.store?.name || 'Unknown Store'
  };
  
  // Convert to full URLs if request object is provided
  if (req) {
    if (data.thumbnailUrl && !data.thumbnailUrl.startsWith('http')) {
      data.thumbnailUrl = `${req.protocol}://${req.get('host')}${data.thumbnailUrl}`;
    }
    if (data.designUrl && !data.designUrl.startsWith('http')) {
      data.designUrl = `${req.protocol}://${req.get('host')}${data.designUrl}`;
    }
  }
  
  return data;
};

module.exports = mongoose.model('SavedDesign', savedDesignSchema);