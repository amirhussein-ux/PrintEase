// backend/models/savedDesignModel.js - ENHANCED VERSION
const mongoose = require('mongoose');

const savedDesignSchema = new mongoose.Schema({
  user: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true,
    index: true // Add index for faster queries
  },
  store: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'PrintStore', 
    required: true,
    index: true // Add index for faster queries
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
    index: true // Add index for filtering
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
        max: 1000 // Max 1000mm
      },
      height: { 
        type: Number,
        min: 1,
        max: 1000 // Max 1000mm
      }
    },
    
    // Store original uploaded image for recreation
    originalImage: { 
      type: String,
      trim: true
    }
  },
  
  // Metadata
  thumbnail: { 
    type: String, // Base64 thumbnail for quick preview
    trim: true
  },
  tags: [{ 
    type: String,
    trim: true,
    lowercase: true
  }],
  isActive: { 
    type: Boolean, 
    default: true,
    index: true // Add index for filtering
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
    index: true // Add index for sorting
  },
  updatedAt: { 
    type: Date, 
    default: Date.now 
  }
}, {
  // Ensure virtuals are included
  toJSON: { 
    virtuals: true,
    transform: function(doc, ret) {
      // Remove sensitive/technical fields when converting to JSON
      delete ret.__v;
      return ret;
    }
  },
  toObject: { 
    virtuals: true,
    transform: function(doc, ret) {
      delete ret.__v;
      return ret;
    }
  },
  timestamps: false // We handle timestamps manually
});

// Add virtual for easy access to original image
savedDesignSchema.virtual('originalDesignImage').get(function() {
  return this.customization?.originalImage || this.thumbnail;
});

// Add virtual for design URL
savedDesignSchema.virtual('designUrl').get(function() {
  if (this.designFile?.fileId) {
    return `/api/saved-designs/${this.user}/thumbnail/${this.designFile.fileId}`;
  }
  return null;
});

// Add virtual for thumbnail URL
savedDesignSchema.virtual('thumbnailUrl').get(function() {
  if (this.thumbnail) {
    if (this.thumbnail.startsWith('data:') || this.thumbnail.startsWith('http')) {
      return this.thumbnail;
    }
    return `/api/saved-designs/${this.user}/thumbnail/${this.thumbnail}`;
  }
  return null;
});

// Add virtual for is3DProduct
savedDesignSchema.virtual('is3DProduct').get(function() {
  return ['Mug', 'T-Shirt'].includes(this.productType);
});

// Add virtual for is2DProduct
savedDesignSchema.virtual('is2DProduct').get(function() {
  return ['Mousepad', 'Sticker', 'Phone Case'].includes(this.productType);
});

// Update timestamps on save
savedDesignSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  
  // Ensure thumbnail exists if not provided
  if (!this.thumbnail && this.customization?.originalImage) {
    this.thumbnail = this.customization.originalImage;
  }
  
  // Ensure originalImage is set if not provided
  if (!this.customization?.originalImage && this.thumbnail) {
    if (!this.customization) {
      this.customization = {};
    }
    this.customization.originalImage = this.thumbnail;
  }
  
  // Clean up tags
  if (this.tags && Array.isArray(this.tags)) {
    this.tags = this.tags
      .filter(tag => tag && typeof tag === 'string')
      .map(tag => tag.trim().toLowerCase())
      .filter((tag, index, arr) => arr.indexOf(tag) === index); // Remove duplicates
  }
  
  next();
});

// Create compound indexes for common queries
savedDesignSchema.index({ user: 1, isActive: 1, createdAt: -1 }); // User's active designs
savedDesignSchema.index({ store: 1, isActive: 1, createdAt: -1 }); // Store's designs
savedDesignSchema.index({ productType: 1, isActive: 1 }); // Filter by product type
savedDesignSchema.index({ tags: 1 }); // Search by tags

// Static method to find designs by user
savedDesignSchema.statics.findByUser = function(userId, options = {}) {
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
  
  return this.find(query)
    .populate('store', 'name logoFileId address')
    .sort({ createdAt: -1 })
    .limit(options.limit || 100);
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

// Instance method to get public data (for sharing)
savedDesignSchema.methods.getPublicData = function() {
  return {
    _id: this._id,
    name: this.name,
    productType: this.productType,
    color: this.color,
    thumbnail: this.thumbnailUrl || this.thumbnail,
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

// Instance method to check if design can be recreated
savedDesignSchema.methods.canBeRecreated = function() {
  return !!(this.customization?.originalImage || this.thumbnail);
};

module.exports = mongoose.model('SavedDesign', savedDesignSchema);