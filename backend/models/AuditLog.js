const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
  action: {
    type: String,
    required: true,
    enum: ['create', 'update', 'delete', 'login', 'download', 'view', 'export']
  },
  resource: {
    type: String,
    required: true
  },
  resourceId: {
    type: String
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

module.exports = mongoose.model('AuditLog', auditLogSchema);