const mongoose = require('mongoose');

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
  storeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'PrintStore',
    required: true
  },
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
});

// indexes for better performance
auditLogSchema.index({ storeId: 1, timestamp: -1 });
auditLogSchema.index({ user: 1, timestamp: -1 });
auditLogSchema.index({ action: 1, resource: 1 });


module.exports = mongoose.model('AuditLog', auditLogSchema);