const Service = require('../models/serviceModel');
const PrintStore = require('../models/printStoreModel');
const InventoryItem = require('../models/inventoryItemModel');
const mongoose = require('mongoose');

// Helper: get store for current owner
async function getOwnerStore(userId) {
  const store = await PrintStore.findOne({ owner: userId });
  return store;
}

// Helper: validate inventory requirements
async function validateInventoryRequirements(storeId, requiredInventory, inventoryQuantityPerUnit) {
  if (!requiredInventory) return true; // No inventory requirement
  
  const inventoryItem = await InventoryItem.findOne({ 
    _id: requiredInventory, 
    store: storeId 
  });
  
  if (!inventoryItem) {
    throw new Error('Required inventory item not found');
  }
  
  return true;
}

// Helper: check if service can be enabled based on inventory
async function canEnableService(service) {
  // If explicitly linked, use that inventory
  if (service.requiredInventory) {
    const inventoryItem = await InventoryItem.findById(service.requiredInventory);
    if (!inventoryItem) return false;
    return inventoryItem.amount > 0 && inventoryItem.amount >= inventoryItem.minAmount;
  }

  // Otherwise, try to infer link via attribute option names
  try {
    const optionNames = new Set();
    if (Array.isArray(service.variants)) {
      for (const v of service.variants) {
        if (v && Array.isArray(v.options)) {
          for (const o of v.options) {
            if (o && o.name) optionNames.add(o.name);
          }
        }
      }
    }
    if (optionNames.size === 0) return false;

    const inv = await InventoryItem.findOne({
      store: service.store,
      name: { $in: Array.from(optionNames) },
    });
    if (!inv) return false;
    return inv.amount > 0 && inv.amount >= inv.minAmount;
  } catch (_) {
    return false;
  }
}

// Helper: auto-disable services based on inventory status
async function autoDisableServicesBasedOnInventory(storeId) {
  const services = await Service.find({ store: storeId, active: true });
  
  for (const service of services) {
    const canEnable = await canEnableService(service);
    if (!canEnable) {
      service.active = false;
      service.autoDisabled = true;
      service.disableReason = service.requiredInventory ? 'Insufficient inventory' : 'No inventory linked';
      await service.save();
    }
  }
}

// Create service for owner's store
exports.createService = async (req, res) => {
  try {
    const userId = req.user.id;
    const store = await getOwnerStore(userId);
    if (!store) return res.status(404).json({ message: 'No print store found for owner' });

  let { name, description, basePrice, unit, currency, active = true, variants = [], requiredInventory, inventoryQuantityPerUnit = 1 } = req.body;
    // type coercion for multipart fields
    const basePriceNum = typeof basePrice === 'string' ? parseFloat(basePrice) : basePrice;
    const activeBool = typeof active === 'string' ? active === 'true' || active === '1' : !!active;
    let variantsArr = variants;
    if (typeof variants === 'string') {
      try { variantsArr = JSON.parse(variants); } catch { variantsArr = []; }
    }
    
    // Validate inventory requirements
    if (requiredInventory) {
      await validateInventoryRequirements(store._id, requiredInventory, inventoryQuantityPerUnit);
    }
    
    const doc = {
      store: store._id,
      name,
      description,
      basePrice: Number.isFinite(basePriceNum) ? basePriceNum : 0,
  unit,
  currency,
      active: activeBool,
      variants: Array.isArray(variantsArr) ? variantsArr : [],
      requiredInventory: requiredInventory || undefined,
      inventoryQuantityPerUnit: Number(inventoryQuantityPerUnit) || 1,
    };
    // image file
    if (req.file && req.file.buffer) {
      const bucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db, { bucketName: 'uploads' });
      const uploadStream = bucket.openUploadStream(req.file.originalname, {
        contentType: req.file.mimetype,
      });
      uploadStream.end(req.file.buffer);
      const fileId = await new Promise((resolve, reject) => {
        uploadStream.on('finish', () => resolve(uploadStream.id));
        uploadStream.on('error', reject);
      });
      doc.imageFileId = fileId;
      doc.imageMime = req.file.mimetype;
    }
    const svc = await Service.create(doc);
    // Build enriched response with inventory status
    try {
      await svc.populate('requiredInventory');
      const canEnable = await canEnableService(svc);
      let inventoryStatus = null;
      if (svc.requiredInventory) {
        inventoryStatus = {
          name: svc.requiredInventory.name,
          amount: svc.requiredInventory.amount,
          minAmount: svc.requiredInventory.minAmount,
          isLowStock: svc.requiredInventory.amount <= svc.requiredInventory.minAmount,
        };
      } else {
        const optionNames = new Set();
        if (Array.isArray(svc.variants)) {
          for (const v of svc.variants) {
            if (v && Array.isArray(v.options)) {
              for (const o of v.options) {
                if (o && o.name) optionNames.add(o.name);
              }
            }
          }
        }
        if (optionNames.size > 0) {
          const items = await InventoryItem.find({ store: store._id, name: { $in: Array.from(optionNames) } });
          if (items && items.length) {
            let pick = items.find((it) => it.amount > 0 && it.amount >= it.minAmount) || items[0];
            inventoryStatus = {
              name: pick.name,
              amount: pick.amount,
              minAmount: pick.minAmount,
              isLowStock: pick.amount <= pick.minAmount,
            };
          }
        }
      }
      return res.status(201).json({ ...svc.toObject(), canEnable, inventoryStatus });
    } catch (_) {
      return res.status(201).json(svc);
    }
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Update service (owner only, must belong to owner's store)
exports.updateService = async (req, res) => {
  try {
    const userId = req.user.id;
    const store = await getOwnerStore(userId);
    if (!store) return res.status(404).json({ message: 'No print store found for owner' });
    const { id } = req.params;
    const svc = await Service.findOne({ _id: id, store: store._id });
    if (!svc) return res.status(404).json({ message: 'Service not found' });

  let updates = req.body || {};
    // coerce fields
    if (updates.basePrice !== undefined) {
      const n = typeof updates.basePrice === 'string' ? parseFloat(updates.basePrice) : updates.basePrice;
      updates.basePrice = Number.isFinite(n) ? n : svc.basePrice;
    }
    if (updates.active !== undefined) {
      updates.active = typeof updates.active === 'string' ? (updates.active === 'true' || updates.active === '1') : !!updates.active;
    }
  if (updates.variants !== undefined) {
      if (typeof updates.variants === 'string') {
        try { updates.variants = JSON.parse(updates.variants); } catch { updates.variants = svc.variants; }
      }
      if (!Array.isArray(updates.variants)) updates.variants = svc.variants;
    }
    
    // Validate inventory requirements if being updated
    if (updates.requiredInventory !== undefined) {
      if (updates.requiredInventory) {
        await validateInventoryRequirements(store._id, updates.requiredInventory, updates.inventoryQuantityPerUnit || svc.inventoryQuantityPerUnit);
      }
    }
    
    if (updates.inventoryQuantityPerUnit !== undefined) {
      updates.inventoryQuantityPerUnit = Number(updates.inventoryQuantityPerUnit) || 1;
    }
    
  // normalize inventory unlinking when empty string is sent from multipart
    if (updates.requiredInventory === '') {
      updates.requiredInventory = undefined;
    }
  // currency may come as a string code; let schema enum validate
    const wasAutoDisabled = !!svc.autoDisabled;
    Object.assign(svc, updates);
    // If the service now satisfies inventory requirements, clear auto-disable flags and auto-enable when previously auto-disabled
    try {
      const eligible = await canEnableService(svc);
      if (eligible) {
        if (wasAutoDisabled && !svc.active) {
          // Auto re-enable if the previous state was auto-disabled and now eligible
          svc.active = true;
        }
        if (svc.autoDisabled || svc.disableReason) {
          svc.autoDisabled = false;
          svc.disableReason = undefined;
        }
      }
    } catch (_) {
      // ignore eligibility errors here; will be handled by save/validation
    }
    const bucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db, { bucketName: 'uploads' });
    // handle remove image flag
    const removeImageFlag = typeof updates.removeImage === 'string' ? (updates.removeImage === 'true' || updates.removeImage === '1') : !!updates.removeImage;
    if (removeImageFlag && svc.imageFileId) {
      try {
        await bucket.delete(svc.imageFileId);
      } catch (_) { /* ignore if already missing */ }
      svc.imageFileId = undefined;
      svc.imageMime = undefined;
    }
    // replace image if new file provided; delete old if exists
    if (req.file && req.file.buffer) {
      if (svc.imageFileId) {
        try { await bucket.delete(svc.imageFileId); } catch (_) {}
      }
      const uploadStream = bucket.openUploadStream(req.file.originalname, {
        contentType: req.file.mimetype,
      });
      uploadStream.end(req.file.buffer);
      const fileId = await new Promise((resolve, reject) => {
        uploadStream.on('finish', () => resolve(uploadStream.id));
        uploadStream.on('error', reject);
      });
      svc.imageFileId = fileId;
      svc.imageMime = req.file.mimetype;
    }
    await svc.save();
    // Build enriched response with inventory status
    try {
      await svc.populate('requiredInventory');
      const canEnable = await canEnableService(svc);
      let inventoryStatus = null;
      if (svc.requiredInventory) {
        inventoryStatus = {
          name: svc.requiredInventory.name,
          amount: svc.requiredInventory.amount,
          minAmount: svc.requiredInventory.minAmount,
          isLowStock: svc.requiredInventory.amount <= svc.requiredInventory.minAmount,
        };
      } else {
        const optionNames = new Set();
        if (Array.isArray(svc.variants)) {
          for (const v of svc.variants) {
            if (v && Array.isArray(v.options)) {
              for (const o of v.options) {
                if (o && o.name) optionNames.add(o.name);
              }
            }
          }
        }
        if (optionNames.size > 0) {
          const items = await InventoryItem.find({ store: store._id, name: { $in: Array.from(optionNames) } });
          if (items && items.length) {
            let pick = items.find((it) => it.amount > 0 && it.amount >= it.minAmount) || items[0];
            inventoryStatus = {
              name: pick.name,
              amount: pick.amount,
              minAmount: pick.minAmount,
              isLowStock: pick.amount <= pick.minAmount,
            };
          }
        }
      }
      return res.json({ ...svc.toObject(), canEnable, inventoryStatus });
    } catch (_) {
      return res.json(svc);
    }
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Soft delete service (owner only)
exports.deleteService = async (req, res) => {
  try {
    const userId = req.user.id;
    const store = await getOwnerStore(userId);
    if (!store) return res.status(404).json({ message: 'No print store found for owner' });
    const { id } = req.params;
    const svc = await Service.findOne({ _id: id, store: store._id });
    if (!svc) return res.status(404).json({ message: 'Service not found' });
    if (svc.deletedAt) return res.status(400).json({ message: 'Service already deleted' });
    svc.deletedAt = new Date();
    await svc.save();
    res.json({ success: true, deletedAt: svc.deletedAt });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// List services for current owner
exports.listMyServices = async (req, res) => {
  try {
    const userId = req.user.id;
    const store = await getOwnerStore(userId);
    if (!store) return res.status(404).json({ message: 'No print store found for owner' });
    const list = await Service.find({ store: store._id, deletedAt: null }).sort({ createdAt: -1 });
    res.json(list);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Public: list by store id
exports.listByStore = async (req, res) => {
  try {
    const { storeId } = req.params;
    const list = await Service.find({ store: storeId, active: true, deletedAt: null }).sort({ createdAt: -1 });
    res.json(list);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Stream service image by id
exports.getServiceImage = async (req, res) => {
  try {
    const { id } = req.params;
    const svc = await Service.findById(id);
    if (!svc || !svc.imageFileId) return res.status(404).send('No image');
    const bucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db, { bucketName: 'uploads' });
    res.set('Content-Type', svc.imageMime || 'application/octet-stream');
    const download = bucket.openDownloadStream(svc.imageFileId);
    download.pipe(res);
    download.on('error', () => res.status(500).end());
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Get services with inventory status for owner
exports.getServicesWithInventoryStatus = async (req, res) => {
  try {
    const userId = req.user.id;
    const store = await getOwnerStore(userId);
    if (!store) return res.status(404).json({ message: 'No print store found for owner' });
    
    // First, auto-disable services based on inventory
    await autoDisableServicesBasedOnInventory(store._id);
    
    const services = await Service.find({ store: store._id, deletedAt: null })
      .populate('requiredInventory')
      .sort({ createdAt: -1 });
    
    // Add inventory status and clear stale auto-disable flags when eligible
    const servicesWithStatus = [];
    for (const service of services) {
      const canEnable = await canEnableService(service);
      if (canEnable && (service.autoDisabled || service.disableReason)) {
        service.autoDisabled = false;
        service.disableReason = undefined;
        try { await service.save(); } catch (_) { /* ignore save issues here */ }
      }
      let inventoryStatus = null;
      if (service.requiredInventory) {
        inventoryStatus = {
          name: service.requiredInventory.name,
          amount: service.requiredInventory.amount,
          minAmount: service.requiredInventory.minAmount,
          isLowStock: service.requiredInventory.amount <= service.requiredInventory.minAmount,
        };
      } else {
        // Try attribute-based match for status display
        const optionNames = new Set();
        if (Array.isArray(service.variants)) {
          for (const v of service.variants) {
            if (v && Array.isArray(v.options)) {
              for (const o of v.options) {
                if (o && o.name) optionNames.add(o.name);
              }
            }
          }
        }
        if (optionNames.size > 0) {
          // Prefer an item that is not low stock if available
          const items = await InventoryItem.find({ store: store._id, name: { $in: Array.from(optionNames) } });
          if (items && items.length) {
            // pick best
            let pick = items.find((it) => it.amount > 0 && it.amount >= it.minAmount) || items[0];
            inventoryStatus = {
              name: pick.name,
              amount: pick.amount,
              minAmount: pick.minAmount,
              isLowStock: pick.amount <= pick.minAmount,
            };
          }
        }
      }

      servicesWithStatus.push({
        ...service.toObject(),
        canEnable,
        inventoryStatus,
      });
    }
    
    res.json(servicesWithStatus);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// List soft-deleted services for current owner
exports.listDeleted = async (req, res) => {
  try {
    const userId = req.user.id;
    const store = await getOwnerStore(userId);
    if (!store) return res.status(404).json({ message: 'No print store found for owner' });
    const list = await Service.find({ store: store._id, deletedAt: { $ne: null } }).sort({ deletedAt: -1 });
    res.json(list);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Restore a soft-deleted service
exports.restoreService = async (req, res) => {
  try {
    const userId = req.user.id;
    const store = await getOwnerStore(userId);
    if (!store) return res.status(404).json({ message: 'No print store found for owner' });
    const { id } = req.params;
    const svc = await Service.findOne({ _id: id, store: store._id });
    if (!svc) return res.status(404).json({ message: 'Service not found' });
    if (!svc.deletedAt) return res.status(400).json({ message: 'Service is not deleted' });
    svc.deletedAt = null;
    await svc.save();
    res.json(svc);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
