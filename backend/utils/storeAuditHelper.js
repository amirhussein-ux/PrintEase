// utils/storeAuditHelper.js
const getStoreAuditModel = require('../models/StoreAuditLog');

const storeAudit = async (req, store, action, resource, resourceId, details = {}) => {
  try {
    // ✅ ONLY log for owners/employees, NOT for customers/guests
    const userRole = req.user?.role;
    const isSystem = details.createdBy === 'System' || details.updatedBy === 'System';
    
    // Skip logging if it's a customer or guest (unless it's a system action)
    if (!isSystem && (userRole === 'customer' || userRole === 'guest')) {
      return; // Don't log customer/guest actions
    }
    
    const StoreAudit = getStoreAuditModel(store._id);
    
    await StoreAudit.create({
      action,
      resource,
      resourceId,
      user: req.user?.email || req.user?.username || 'System',
      userRole: userRole || 'unknown',
      details,
      ipAddress: req.ip || req.connection.remoteAddress
    });
    
    console.log(`✅ [Store ${store._id}] ${action} ${resource}:${resourceId}`);
  } catch (auditErr) {
    console.error(`❌ Failed to create ${action} audit log for store ${store._id}:`, auditErr.message);
  }
};

module.exports = storeAudit;