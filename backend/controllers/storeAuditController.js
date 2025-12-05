const getStoreAuditModel = require('../models/StoreAuditLog');
const { getManagedStore } = require('../utils/storeAccess');

exports.getStoreAuditLogs = async (req, res) => {
  try {
    const store = await getManagedStore(req);
    const StoreAudit = getStoreAuditModel(store._id);
    
    const { limit = 100, skip = 0, startDate, endDate } = req.query;
    
    let query = {};
    if (startDate || endDate) {
      query.timestamp = {};
      if (startDate) query.timestamp.$gte = new Date(startDate);
      if (endDate) query.timestamp.$lte = new Date(endDate);
    }
    
    const logs = await StoreAudit.find(query)
      .sort({ timestamp: -1 })
      .skip(parseInt(skip))
      .limit(parseInt(limit));
    
    res.json({
      storeId: store._id,
      storeName: store.name,
      logs,
      total: logs.length
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};