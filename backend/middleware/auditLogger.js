const AuditLog = require('../models/AuditLog');

const auditLogger = (action, resource) => {
  return async (req, res, next) => {
    const originalSend = res.send;
    
    res.send = function(data) {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        logAudit(action, resource, req, data).catch(console.error);
      }
      
      originalSend.call(this, data);
    };
    
    next();
  };
};

async function logAudit(action, resource, req, responseData) {
  try {
    let user = 'Unknown';
    let userRole = 'Unknown';
    let storeId = null;

    console.log(`🔍 Audit attempt for: ${action} ${resource}`);
    console.log('Response data:', responseData);

    // Handle different response formats
    if (responseData) {
      let responseObj = responseData;
      
      // If response is stringified JSON, parse it
      if (typeof responseData === 'string') {
        try {
          responseObj = JSON.parse(responseData);
        } catch (e) {
          // Not JSON, keep as string
        }
      }

      // Extract user info from response object
      if (responseObj && responseObj.user) {
        user = responseObj.user.email || responseObj.user.username || responseObj.user._id || 'Unknown';
        userRole = responseObj.user.role || 'Unknown';
        storeId = responseObj.user.storeId || responseObj.user.store || responseObj.user._id;
        
        console.log(`📝 Extracted from response: ${user} (${userRole})`);
      }
      
      // For login with token but no user object
      else if (responseObj && responseObj.token) {
        user = req.body?.email || 'Unknown';
        userRole = 'customer'; // Default for login
        console.log(`📝 Login with token, using email: ${user}`);
      }
    }

    // For authenticated routes, use req.user if available
    if (req.user) {
      user = req.user.email || req.user.username || req.user.fullName || req.user._id || user;
      userRole = req.user.role || req.user.employeeRole || userRole;
      storeId = req.user.storeId || req.user.store || req.user._id || storeId;
      console.log(`📝 Using req.user: ${user} (${userRole})`);
    }

    // For guest login, set appropriate role
    if (action === 'guest_login') {
      userRole = 'guest';
      user = 'Guest User';
    }

    let resourceId = req.params.id || req.body?._id || null;
    
    const details = {
      requestBody: sanitizeData(req.body),
      response: sanitizeData(responseData),
      method: req.method,
      endpoint: req.originalUrl
    };
    
    const auditLog = new AuditLog({
      action,
      resource,
      resourceId,
      user,
      userRole,
      storeId,
      details,
      ipAddress: req.ip || req.connection.remoteAddress
    });
    
    await auditLog.save();
    console.log(`✅ Audit log created: ${action} ${resource} by ${user} (${userRole})`);
  } catch (error) {
    console.error('❌ Audit logging failed:', error);
  }
}

function sanitizeData(data) {
  if (typeof data !== 'object' || data === null) return data;
  
  const sanitized = { ...data };
  const sensitiveFields = ['password', 'token', 'refreshToken', 'creditCard', 'cvv'];
  
  sensitiveFields.forEach(field => {
    if (sanitized[field]) {
      sanitized[field] = '***REDACTED***';
    }
  });
  
  return sanitized;
}

module.exports = auditLogger;