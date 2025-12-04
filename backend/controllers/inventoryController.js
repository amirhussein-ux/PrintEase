const InventoryItem = require('../models/inventoryItemModel');
const DeletedInventoryItem = require('../models/deletedInventoryItemModel'); 
const Service = require('../models/serviceModel'); // Add Service import
const { getManagedStore, AccessError } = require('../utils/storeAccess');
const AuditLog = require('../models/AuditLog');

const STORE_STAFF_ROLES = ['Operations Manager', 'Front Desk', 'Inventory & Supplies', 'Printer Operator'];

// Helper for error handling
const handleError = (res, err) => {
  if (err instanceof AccessError) {
    return res.status(err.statusCode).json({ message: err.message });
  }
  res.status(500).json({ message: err.message });
};

// Helper for audit logging
const logAudit = async (req, store, action, resource, resourceId, details = {}) => {
  try {
    await AuditLog.create({
      action,
      resource,
      resourceId,
      user: req.user?.email || req.user?.username || 'System',
      userRole: req.user?.role || 'unknown',
      storeId: store._id,
      details,
      ipAddress: req.ip || req.connection.remoteAddress
    });
    console.log(`✅ ${action} audit log created for ${resource}: ${resourceId}`);
  } catch (auditErr) {
    console.error(`❌ Failed to create ${action} audit log:`, auditErr.message);
  }
};

// ✅ NEW FUNCTION: Get inventory stock for services in a store (public access)
exports.getStockForServices = async (req, res) => {
  try {
    const { storeId } = req.params;
    const { serviceIds } = req.query;

    if (!storeId) {
      return res.status(400).json({ message: 'storeId is required' });
    }

    // Get all services for the store
    const services = await Service.find({ store: storeId, active: true });
    
    // If specific service IDs are requested, filter them
    let filteredServices = services;
    if (serviceIds) {
      const idsArray = serviceIds.split(',').map(id => id.trim());
      filteredServices = services.filter(service => 
        idsArray.includes(service._id.toString())
      );
    }

    // Get inventory stock for each service
    const stockInfo = await Promise.all(
      filteredServices.map(async (service) => {
        let availableStock = null;
        let stockItemName = null;
        let stockItemId = null;

        // Check if service has required inventory
        if (service.requiredInventory) {
          const inventoryItem = await InventoryItem.findById(service.requiredInventory);
          if (inventoryItem) {
            availableStock = Math.floor(inventoryItem.amount / (service.inventoryQuantityPerUnit || 1));
            stockItemName = inventoryItem.name;
            stockItemId = inventoryItem._id;
          }
        } else {
          // Fallback: try to find inventory by service name
          const inventoryItem = await InventoryItem.findOne({ 
            store: storeId, 
            name: service.name 
          });
          if (inventoryItem) {
            availableStock = Math.floor(inventoryItem.amount / (service.inventoryQuantityPerUnit || 1));
            stockItemName = inventoryItem.name;
            stockItemId = inventoryItem._id;
          }
        }

        // Check service variants for inventory-linked options
        const variantStockInfo = [];
        if (service.variants && service.variants.length > 0) {
          for (const variant of service.variants) {
            for (const option of variant.options) {
              if (option.linkedInventoryId) {
                const invItem = await InventoryItem.findById(option.linkedInventoryId);
                if (invItem) {
                  variantStockInfo.push({
                    variantLabel: variant.label,
                    optionName: option.name,
                    availableStock: invItem.amount,
                    stockItemName: invItem.name,
                    stockItemId: invItem._id
                  });
                }
              }
            }
          }
        }

        return {
          serviceId: service._id,
          serviceName: service.name,
          availableStock: availableStock !== null ? Math.max(0, availableStock) : null, // Ensure non-negative
          stockItemName,
          stockItemId,
          hasStockLimit: availableStock !== null,
          variantStockInfo: variantStockInfo.length > 0 ? variantStockInfo : undefined,
          inventoryQuantityPerUnit: service.inventoryQuantityPerUnit || 1
        };
      })
    );

    res.json({
      success: true,
      storeId,
      stockInfo
    });
  } catch (err) {
    console.error('Error getting stock for services:', err);
    res.status(500).json({ message: err.message });
  }
};

// ✅ NEW FUNCTION: Check stock availability before ordering
exports.checkStockAvailability = async (req, res) => {
  try {
    const { storeId, serviceId, quantity, selectedOptions } = req.body;

    if (!storeId || !serviceId || !quantity) {
      return res.status(400).json({ 
        message: 'storeId, serviceId, and quantity are required' 
      });
    }

    const service = await Service.findById(serviceId);
    if (!service || String(service.store) !== String(storeId)) {
      return res.status(404).json({ message: 'Service not found in store' });
    }

    let availableStock = null;
    let stockItemName = null;
    let requiredQuantity = quantity;

    // Calculate required quantity based on inventory per unit
    const inventoryPerUnit = service.inventoryQuantityPerUnit || 1;
    requiredQuantity = quantity * inventoryPerUnit;

    // Check if service has required inventory
    if (service.requiredInventory) {
      const inventoryItem = await InventoryItem.findById(service.requiredInventory);
      if (inventoryItem) {
        availableStock = inventoryItem.amount;
        stockItemName = inventoryItem.name;
      }
    } else {
      // Fallback: try to find inventory by service name
      const inventoryItem = await InventoryItem.findOne({ 
        store: storeId, 
        name: service.name 
      });
      if (inventoryItem) {
        availableStock = inventoryItem.amount;
        stockItemName = inventoryItem.name;
      }
    }

    // Check variant options for inventory
    let variantStockIssues = [];
    if (selectedOptions && selectedOptions.length > 0 && service.variants) {
      for (const option of selectedOptions) {
        const variant = service.variants.find(v => v.label === option.label);
        if (variant && variant.options[option.optionIndex]) {
          const variantOption = variant.options[option.optionIndex];
          if (variantOption.linkedInventoryId) {
            const invItem = await InventoryItem.findById(variantOption.linkedInventoryId);
            if (invItem) {
              const requiredForOption = quantity * (variantOption.inventoryQuantity || 1);
              if (invItem.amount < requiredForOption) {
                variantStockIssues.push({
                  variant: variant.label,
                  option: variantOption.name,
                  required: requiredForOption,
                  available: invItem.amount,
                  stockItemName: invItem.name
                });
              }
            }
          }
        }
      }
    }

    const canFulfill = availableStock !== null ? availableStock >= requiredQuantity : true;
    const hasVariantStockIssues = variantStockIssues.length > 0;

    res.json({
      success: true,
      canFulfill: canFulfill && !hasVariantStockIssues,
      serviceId,
      serviceName: service.name,
      requestedQuantity: quantity,
      requiredInventoryQuantity: requiredQuantity,
      availableStock,
      stockItemName,
      hasStockLimit: availableStock !== null,
      maxAllowed: availableStock !== null ? Math.floor(availableStock / inventoryPerUnit) : null,
      inventoryPerUnit,
      variantStockIssues: hasVariantStockIssues ? variantStockIssues : undefined,
      message: canFulfill && !hasVariantStockIssues 
        ? 'Stock is available' 
        : !canFulfill 
          ? `Insufficient stock. Available: ${Math.floor(availableStock / inventoryPerUnit)} units` 
          : 'Some variant options have insufficient stock'
    });
  } catch (err) {
    console.error('Error checking stock availability:', err);
    res.status(500).json({ message: err.message });
  }
};

exports.listMyInventory = async (req, res) => {
  try {
    const store = await getManagedStore(req, { allowEmployeeRoles: STORE_STAFF_ROLES });
    const items = await InventoryItem.find({ store: store._id }).sort({ createdAt: -1 });
    res.json(items);
  } catch (err) {
    handleError(res, err);
  }
};

exports.createItem = async (req, res) => {
  try {
    const store = await getManagedStore(req, { allowEmployeeRoles: STORE_STAFF_ROLES });
    const { name, amount = 0, minAmount = 0, entryPrice = 0, price = 0, currency = 'PHP', category } = req.body;
    
    const doc = await InventoryItem.create({
      store: store._id,
      name: (name || '').trim(),
      amount: Number(amount) || 0,
      minAmount: Number(minAmount) || 0,
      entryPrice: Number(entryPrice) || 0,
      price: Number(price) || 0,
      currency,
      category: category ? String(category).trim() : undefined,
    });

    // AUDIT LOG: Item Created
    await logAudit(req, store, 'create', 'inventory', doc._id, {
      itemId: doc._id,
      itemName: doc.name,
      amount: doc.amount,
      price: doc.price,
      category: doc.category,
      createdBy: req.user?.email || req.user?.username
    });

    res.status(201).json(doc);
  } catch (err) {
    if (err && err.code === 11000) {
      return res.status(409).json({ message: 'Item with this name already exists' });
    }
    handleError(res, err);
  }
};

exports.updateItem = async (req, res) => {
  try {
    const store = await getManagedStore(req, { allowEmployeeRoles: STORE_STAFF_ROLES });
    const { id } = req.params;
    const item = await InventoryItem.findOne({ _id: id, store: store._id });
    if (!item) return res.status(404).json({ message: 'Item not found' });

    const { name, amount, minAmount, entryPrice, price, currency, category } = req.body;

    // Save old values for audit log
    const oldValues = {
      name: item.name,
      amount: item.amount,
      minAmount: item.minAmount,
      entryPrice: item.entryPrice,
      price: item.price,
      currency: item.currency,
      category: item.category
    };
    
    if (name !== undefined) item.name = String(name).trim();
    if (amount !== undefined) item.amount = Number(amount) || 0;
    if (minAmount !== undefined) item.minAmount = Number(minAmount) || 0;
    if (entryPrice !== undefined) item.entryPrice = Number(entryPrice) || 0;
    if (price !== undefined) item.price = Number(price) || 0;
    if (currency !== undefined) item.currency = currency;
    if (category !== undefined) item.category = String(category).trim() || undefined;

    await item.save();

    // AUDIT LOG: Item Updated
    await logAudit(req, store, 'update', 'inventory', item._id, {
      itemId: item._id,
      itemName: item.name,
      oldValues,
      newValues: {
        name: item.name,
        amount: item.amount,
        minAmount: item.minAmount,
        entryPrice: item.entryPrice,
        price: item.price,
        currency: item.currency,
        category: item.category
      },
      fieldsUpdated: Object.keys(req.body),
      updatedBy: req.user?.email || req.user?.username
    });

    res.json(item);
  } catch (err) {
    if (err && err.code === 11000) {
      return res.status(409).json({ message: 'Item with this name already exists' });
    }
    handleError(res, err);
  }
};

// --- ARCHIVE ITEM (Renamed from deleteItem) ---
exports.archiveItem = async (req, res) => {
  try {
    const store = await getManagedStore(req, { allowEmployeeRoles: STORE_STAFF_ROLES });
    const { id } = req.params;
    const item = await InventoryItem.findOne({ _id: id, store: store._id });
    
    if (!item) return res.status(404).json({ message: 'Item not found' });

    // 1. Create Archive Payload
    const archivedPayload = {
      store: store._id,
      originalId: item._id, // Save old ID
      name: item.name,
      category: item.category,
      amount: item.amount,
      minAmount: item.minAmount,
      entryPrice: item.entryPrice,
      price: item.price,
      currency: item.currency,
      deletedAt: new Date(),
    };

    // 2. Save to "DeletedInventoryItem" collection
    const archived = await DeletedInventoryItem.findOneAndUpdate(
      { store: store._id, originalId: item._id },
      archivedPayload,
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    // 3. Remove from Active collection
    await item.deleteOne();

    // AUDIT LOG: Item Archived
    await logAudit(req, store, 'archive', 'inventory', id, {
      itemId: id,
      itemName: item.name,
      amount: item.amount,
      price: item.price,
      archivedAt: archivedPayload.deletedAt,
      archivedBy: req.user?.email || req.user?.username
    });

    res.json({ success: true, message: 'Item archived successfully', archived });
  } catch (err) {
    handleError(res, err);
  }
};

exports.listArchivedItems = async (req, res) => {
  try {
    const store = await getManagedStore(req, { allowEmployeeRoles: STORE_STAFF_ROLES });
    const items = await DeletedInventoryItem.find({ store: store._id }).sort({ deletedAt: -1 });
    res.json(items);
  } catch (err) {
    handleError(res, err);
  }
};

exports.restoreArchivedItem = async (req, res) => {
  try {
    const store = await getManagedStore(req, { allowEmployeeRoles: STORE_STAFF_ROLES });
    const { deletedId } = req.params;
    
    const archived = await DeletedInventoryItem.findOne({ _id: deletedId, store: store._id });
    if (!archived) return res.status(404).json({ message: 'Archived inventory item not found' });

    const payload = {
      _id: archived.originalId, // Attempt to restore with original ID
      store: store._id,
      name: archived.name,
      category: archived.category,
      amount: archived.amount,
      minAmount: archived.minAmount,
      entryPrice: archived.entryPrice,
      price: archived.price,
      currency: archived.currency,
    };

    let restored;
    try {
      restored = await InventoryItem.create(payload);
    } catch (err) {
      if (err && err.code === 11000) {
        return res.status(409).json({ message: `Cannot restore: An active item with the name "${archived.name}" already exists.` });
      }
      throw err;
    }

    await archived.deleteOne();

    // AUDIT LOG: Item Restored
    await logAudit(req, store, 'restore', 'inventory', restored._id, {
      itemId: restored._id,
      itemName: restored.name,
      restoredFrom: deletedId,
      amount: restored.amount,
      price: restored.price,
      restoredBy: req.user?.email || req.user?.username
    });

    res.json(restored);
  } catch (err) {
    handleError(res, err);
  }
};

exports.purgeArchivedItem = async (req, res) => {
  try {
    const store = await getManagedStore(req, { allowEmployeeRoles: STORE_STAFF_ROLES });
    const { deletedId } = req.params;
    
    const archived = await DeletedInventoryItem.findOneAndDelete({ _id: deletedId, store: store._id });
    
    if (!archived) return res.status(404).json({ message: 'Archived inventory item not found' });

    // AUDIT LOG: Item Permanently Deleted
    await logAudit(req, store, 'delete', 'inventory', deletedId, {
      itemId: deletedId,
      itemName: archived?.name || 'Unknown',
      amount: archived?.amount || 0,
      price: archived?.price || 0,
      permanentlyDeletedAt: new Date(),
      deletedBy: req.user?.email || req.user?.username
    });
    
    res.json({ success: true, message: 'Item permanently deleted' });
  } catch (err) {
    handleError(res, err);
  }
};

exports.listByStore = async (req, res) => {
  try {
    const { storeId } = req.params;
    const list = await InventoryItem.find({ store: storeId }).sort({ createdAt: -1 });
    res.json(list);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};