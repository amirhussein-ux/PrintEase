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
  
  // Thumbnail reference - can be fileId, data URL, or null
  thumbnail: { 
    type: mongoose.Schema.Types.Mixed,
    default: null
  },
  
  // Track thumbnail type for easier URL generation
  thumbnailType: {
    type: String,
    enum: ['fileId', 'dataUrl', null],
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
      ret.originalImage = doc.originalImage;
      delete ret.__v;
      return ret;
    }
  },
  toObject: { 
    virtuals: true,
    transform: function(doc, ret) {
      ret.thumbnailUrl = doc.thumbnailUrl;
      ret.designUrl = doc.designUrl;
      ret.originalImage = doc.originalImage;
      delete ret.__v;
      return ret;
    }
  },
  timestamps: false
});

// Virtual for thumbnail URL - FIXED: Handle ObjectId properly
savedDesignSchema.virtual('thumbnailUrl').get(function() {
  if (!this.thumbnail) return null;
  
  // If thumbnail is already a data URL or external URL
  if (typeof this.thumbnail === 'string') {
    if (this.thumbnail.startsWith('data:') || this.thumbnail.startsWith('http')) {
      return this.thumbnail;
    }
  }
  
  // If thumbnail is an ObjectId (GridFS file)
  let thumbnailId;
  if (typeof this.thumbnail === 'string' && mongoose.Types.ObjectId.isValid(this.thumbnail)) {
    thumbnailId = this.thumbnail;
  } else if (this.thumbnail && this.thumbnail._bsontype === 'ObjectId') {
    thumbnailId = this.thumbnail.toString();
  }
  
  if (thumbnailId) {
    return `/api/saved-designs/${this.user}/thumbnail/${thumbnailId}`;
  }
  
  return null;
});

// Virtual for design URL
savedDesignSchema.virtual('designUrl').get(function() {
  if (this.designFile?.fileId) {
    return `/api/saved-designs/${this._id}/image`;
  }
  return null;
});

// Virtual for original image (from customization)
savedDesignSchema.virtual('originalImage').get(function() {
  return this.customization?.originalImage || this.thumbnailUrl;
});

// Virtual for is3DProduct
savedDesignSchema.virtual('is3DProduct').get(function() {
  return ['Mug', 'T-Shirt'].includes(this.productType);
});

// Virtual for is2DProduct
savedDesignSchema.virtual('is2DProduct').get(function() {
  return ['Mousepad', 'Sticker', 'Phone Case'].includes(this.productType);
});

// Update timestamps and ensure data consistency - FIXED: Handle thumbnail type
savedDesignSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  
  // Determine thumbnail type
  if (this.thumbnail) {
    if (typeof this.thumbnail === 'string') {
      if (this.thumbnail.startsWith('data:')) {
        this.thumbnailType = 'dataUrl';
      } else if (mongoose.Types.ObjectId.isValid(this.thumbnail)) {
        this.thumbnailType = 'fileId';
      }
    } else if (this.thumbnail && this.thumbnail._bsontype === 'ObjectId') {
      this.thumbnailType = 'fileId';
    }
  }
  
  // Ensure originalImage is set in customization
  if (!this.customization?.originalImage) {
    if (!this.customization) {
      this.customization = {};
    }
    // Use thumbnail as originalImage if available and it's a data URL
    if (this.thumbnail && typeof this.thumbnail === 'string' && this.thumbnail.startsWith('data:')) {
      this.customization.originalImage = this.thumbnail;
    }
  }
  
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

// Static method to find designs by user with proper URLs - FIXED
savedDesignSchema.statics.findByUserWithUrls = async function(userId, options = {}) {
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
    .lean();
  
  // Add URL properties
  return designs.map(design => {
    const designObj = design;
    
    // Add thumbnailUrl - FIXED: Handle ObjectId properly
    if (designObj.thumbnail) {
      if (typeof designObj.thumbnail === 'string') {
        if (designObj.thumbnail.startsWith('data:') || designObj.thumbnail.startsWith('http')) {
          designObj.thumbnailUrl = designObj.thumbnail;
        } else if (mongoose.Types.ObjectId.isValid(designObj.thumbnail)) {
          designObj.thumbnailUrl = `/api/saved-designs/${designObj.user}/thumbnail/${designObj.thumbnail}`;
        }
      } else if (designObj.thumbnail && designObj.thumbnail._bsontype === 'ObjectId') {
        designObj.thumbnailUrl = `/api/saved-designs/${designObj.user}/thumbnail/${designObj.thumbnail.toString()}`;
      }
    }
    
    // Add designUrl
    if (designObj.designFile?.fileId) {
      designObj.designUrl = `/api/saved-designs/${designObj._id}/image`;
    }
    
    // Ensure customization has originalImage
    if (!designObj.customization?.originalImage && designObj.thumbnailUrl) {
      if (!designObj.customization) {
        designObj.customization = {};
      }
      designObj.customization.originalImage = designObj.thumbnailUrl;
    }
    
    return designObj;
  });
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
savedDesignSchema.methods.getPublicData = function() {
  return {
    _id: this._id,
    name: this.name,
    productType: this.productType,
    color: this.color,
    thumbnailUrl: this.thumbnailUrl,
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
};

module.exports = mongoose.model('SavedDesign', savedDesignSchema);