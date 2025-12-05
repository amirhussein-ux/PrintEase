// models/StoreAuditLog.js - STORE-SPECIFIC VERSION
const mongoose = require('mongoose');

// Use YOUR EXACT schema from AuditLog.js but remove storeId field
const auditLogSchema = new mongoose.Schema({
  action: {
    type: String,
    required: true,
    enum: [
      // Core CRUD actions
      'create', 'update', 'delete', 'view', 'list',
      
      // Employee specific
      'archive', 'restore', 'login', 'logout',
      
      // Customer/Chat actions
      'message', 'notify', 'upload', 'download',
      
      // Order actions
      'place', 'cancel', 'complete', 'refund',
      
      // Inventory actions  
      'checkin', 'checkout', 'adjust', 'reorder',
      
      // Service actions
      'assign', 'start', 'finish', 'pause',
      
      // File/document actions
      'print', 'export', 'import', 'share'
    ]
  },
  resource: {
    type: String,
    required: true,
    enum: [
      'employee', 'customer', 'chat', 'message',
      'inventory', 'order', 'service', 'product',
      'file', 'store', 'settings', 'payment',
      'notification', 'report'
    ]
  },
  resourceId: {
    type: mongoose.Schema.Types.ObjectId,
    required: false 
  },
  user: {
    type: String,
    required: true
  },
  userRole: {
    type: String,
    required: true
  },
  // ⚠️ REMOVED storeId field - it's implicit in collection name
  details: {
    type: Object
  },
  ipAddress: {
    type: String
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Remove storeId from indexes since it's not in the schema anymore
auditLogSchema.index({ timestamp: -1 });
auditLogSchema.index({ user: 1, timestamp: -1 });
auditLogSchema.index({ action: 1, resource: 1 });

// Factory function to get store-specific model
function getStoreAuditModel(storeId) {
  const collectionName = `audit_logs_${storeId}`;
  
  if (mongoose.models[collectionName]) {
    return mongoose.model(collectionName);
  }
  
  // Create store-specific model with collection name
  return mongoose.model(collectionName, auditLogSchema, collectionName);
}

module.exports = getStoreAuditModel;