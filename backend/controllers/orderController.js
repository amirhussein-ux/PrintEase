const mongoose = require('mongoose');
const Order = require('../models/orderModel');
const Service = require('../models/serviceModel');
const PrintStore = require('../models/printStoreModel');
const InventoryItem = require('../models/inventoryItemModel');
const crypto = require('crypto');
const Notification = require('../models/notificationModel');
const { getManagedStore, AccessError } = require('../utils/storeAccess');

const EMPLOYEE_ROLES = ['Operations Manager', 'Front Desk', 'Inventory & Supplies', 'Printer Operator'];

function computeUnitPrice(service, selectedOptions = []) {
  const base = Number(service.basePrice) || 0;
  const deltas = (selectedOptions || []).reduce((sum, o) => sum + (Number(o.priceDelta) || 0), 0);
  return base + deltas;
}

// ✅ UPDATED: Validate stock before deducting
async function validateAndReserveStock(order, options = { checkOnly: false }) {
  try {
    const stockIssues = [];
    const reservations = [];

    for (const item of order.items) {
      let reqInvId = item.requiredInventory;
      let qtyPerUnit = item.inventoryQuantityPerUnit;
      const matchedIds = new Set();

      // Load service for fallbacks and option processing
      const svc = await Service.findById(item.service);
      if (svc && svc.requiredInventory && !reqInvId) {
        reqInvId = svc.requiredInventory;
        qtyPerUnit = qtyPerUnit || svc.inventoryQuantityPerUnit || 1;
      }
      if (reqInvId) matchedIds.add(String(reqInvId));

      // Fallback: service name match
      if (!reqInvId && svc) {
        const nameMatch = await InventoryItem.findOne({ store: order.store, name: svc.name });
        if (nameMatch) {
          matchedIds.add(String(nameMatch._id));
          qtyPerUnit = qtyPerUnit || 1;
        }
      }

      // Match each selected option's optionName to an inventory item name
      if (Array.isArray(item.selectedOptions)) {
        for (const opt of item.selectedOptions) {
          const optName = opt.optionName || opt.label;
          if (!optName) continue;
          const inv = await InventoryItem.findOne({ store: order.store, name: optName });
          if (inv) matchedIds.add(String(inv._id));
        }
      }

      if (matchedIds.size === 0) {
        // No inventory linked to this item
        reservations.push({
          serviceId: item.service,
          serviceName: item.serviceName,
          status: 'no_inventory_linked',
          message: 'No inventory tracking for this item'
        });
        continue;
      }

      // Check and reserve each matched inventory item
      for (const id of matchedIds) {
        const invItem = await InventoryItem.findById(id);
        if (!invItem) {
          stockIssues.push({
            serviceId: item.service,
            serviceName: item.serviceName,
            inventoryId: id,
            issue: 'inventory_item_not_found'
          });
          continue;
        }

        const perUnit = qtyPerUnit || 1;
        const quantityToReduce = item.quantity * perUnit;
        
        if (invItem.amount < quantityToReduce) {
          stockIssues.push({
            serviceId: item.service,
            serviceName: item.serviceName,
            inventoryId: invItem._id,
            inventoryName: invItem.name,
            required: quantityToReduce,
            available: invItem.amount,
            issue: 'insufficient_stock'
          });
        } else if (!options.checkOnly) {
          // Actually deduct the inventory
          invItem.amount = Math.max(0, invItem.amount - quantityToReduce);
          await invItem.save();
          
          reservations.push({
            serviceId: item.service,
            serviceName: item.serviceName,
            inventoryId: invItem._id,
            inventoryName: invItem.name,
            quantityDeducted: quantityToReduce,
            remainingStock: invItem.amount,
            status: 'reserved'
          });
        } else {
          // Just check, don't deduct
          reservations.push({
            serviceId: item.service,
            serviceName: item.serviceName,
            inventoryId: invItem._id,
            inventoryName: invItem.name,
            required: quantityToReduce,
            available: invItem.amount,
            status: 'available'
          });
        }
      }
    }

    return { stockIssues, reservations };
  } catch (error) {
    console.error('Stock validation error:', error);
    throw error;
  }
}

async function reduceInventoryForOrder(order) {
  try {
    const result = await validateAndReserveStock(order, { checkOnly: false });
    
    if (result.stockIssues.length > 0) {
      const issue = result.stockIssues[0];
      throw new Error(
        `Insufficient inventory for ${issue.inventoryName || 'item'}. ` +
        `Required: ${issue.required}, Available: ${issue.available}`
      );
    }
    
    return result.reservations;
  } catch (error) {
    console.error('Error reducing inventory:', error);
    throw error;
  }
}

// ✅ UPDATED: Check stock before creating order
exports.createOrder = async (req, res) => {
  try {
    const requester = req.user; // may be guest
    if (!requester) return res.status(401).json({ message: 'Unauthorized' });
    const isGuest = requester.role === 'guest';
    const userId = isGuest ? undefined : requester.id;

    let { storeId, serviceId, quantity, notes, selectedOptions, currency } = req.body;
    if (!storeId || !serviceId) return res.status(400).json({ message: 'storeId and serviceId are required' });

    const qty = Number.parseInt(quantity, 10) || 1;
    if (qty < 1) return res.status(400).json({ message: 'Quantity must be >= 1' });

    let options = [];
    if (typeof selectedOptions === 'string') {
      try { options = JSON.parse(selectedOptions); } catch { options = []; }
    } else if (Array.isArray(selectedOptions)) {
      options = selectedOptions;
    }

    const store = await PrintStore.findById(storeId).populate("owner"); // important: get store owner
    if (!store) return res.status(404).json({ message: 'Store not found' });

    const service = await Service.findById(serviceId);
    if (!service || String(service.store) !== String(store._id)) {
      return res.status(404).json({ message: 'Service not found in store' });
    }

    // ✅ NEW: Check if service has stock limit and validate quantity
    let maxAllowedQuantity = 9999; // Default high value for unlimited
    let hasStockLimit = false;
    let stockInfo = null;

    // Check if service has inventory linked
    if (service.requiredInventory) {
      const inventoryItem = await InventoryItem.findById(service.requiredInventory);
      if (inventoryItem) {
        const inventoryPerUnit = service.inventoryQuantityPerUnit || 1;
        maxAllowedQuantity = Math.floor(inventoryItem.amount / inventoryPerUnit);
        hasStockLimit = true;
        stockInfo = {
          availableStock: inventoryItem.amount,
          inventoryPerUnit,
          maxAllowedQuantity,
          inventoryName: inventoryItem.name
        };
      }
    } else {
      // Fallback: try to find inventory by service name
      const inventoryItem = await InventoryItem.findOne({ 
        store: store._id, 
        name: service.name 
      });
      if (inventoryItem) {
        maxAllowedQuantity = Math.floor(inventoryItem.amount);
        hasStockLimit = true;
        stockInfo = {
          availableStock: inventoryItem.amount,
          inventoryPerUnit: 1,
          maxAllowedQuantity,
          inventoryName: inventoryItem.name
        };
      }
    }

    // ✅ Validate quantity against stock limit
    if (hasStockLimit && qty > maxAllowedQuantity) {
      return res.status(400).json({
        message: `Quantity exceeds available stock. Maximum allowed: ${maxAllowedQuantity}`,
        maxAllowedQuantity,
        availableStock: stockInfo.availableStock,
        requestedQuantity: qty
      });
    }

    const enrichedOptions = (options || []).map((o) => {
      let optionName = o.optionName;
      let priceDelta = o.priceDelta;
      if ((priceDelta === undefined || optionName === undefined) && Array.isArray(service.variants)) {
        const variant = service.variants.find((v) => v.label === o.label);
        if (variant && Number.isInteger(o.optionIndex) && variant.options[o.optionIndex]) {
          optionName = variant.options[o.optionIndex].name;
          priceDelta = variant.options[o.optionIndex].priceDelta || 0;
        }
      }
      return { label: o.label, optionIndex: o.optionIndex, optionName, priceDelta: Number(priceDelta) || 0 };
    });

    const unitPrice = computeUnitPrice(service, enrichedOptions);
    const total = unitPrice * qty;

    const orderDoc = {
      user: userId,
      guestId: isGuest ? requester.id : undefined,
      store: store._id,
      items: [
        {
          service: service._id,
          serviceName: service.name,
          unit: service.unit,
          currency: currency || service.currency || 'PHP',
          quantity: qty,
          unitPrice,
          selectedOptions: enrichedOptions,
          totalPrice: total,
          requiredInventory: service.requiredInventory || undefined,
          inventoryQuantityPerUnit: service.inventoryQuantityPerUnit || undefined,
        },
      ],
      notes: notes || '',
      subtotal: total,
      currency: currency || service.currency || 'PHP',
      // ✅ NEW: Store stock info for reference
      stockInfo: hasStockLimit ? {
        inventoryName: stockInfo.inventoryName,
        availableBefore: stockInfo.availableStock,
        quantityDeducted: qty * (stockInfo.inventoryPerUnit || 1),
        availableAfter: stockInfo.availableStock - (qty * (stockInfo.inventoryPerUnit || 1))
      } : undefined,
    };

    // Handle file uploads for order attachments
    const filesMeta = [];
    const bucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db, { bucketName: 'uploads' });
    const fileArray = (req.files && req.files.files) || [];
    if (Array.isArray(fileArray) && fileArray.length > 0) {
      for (const f of fileArray) {
        const uploadStream = bucket.openUploadStream(f.originalname, { contentType: f.mimetype });
        uploadStream.end(f.buffer);
        const fileId = await new Promise((resolve, reject) => {
          uploadStream.on('finish', () => resolve(uploadStream.id));
          uploadStream.on('error', reject);
        });
        filesMeta.push({ fileId, filename: f.originalname, mimeType: f.mimetype, size: f.size });
      }
    }
    orderDoc.files = filesMeta;

    // Handle optional downpayment receipt upload and fields
    if (req.body && (req.body.downPaymentRequired === 'true' || req.body.downPaymentRequired === true)) {
      orderDoc.downPaymentRequired = true;
      const dpAmt = Number(req.body.downPaymentAmount);
      if (!Number.isNaN(dpAmt)) orderDoc.downPaymentAmount = dpAmt;
      orderDoc.downPaymentMethod = req.body.downPaymentMethod || undefined;
      orderDoc.downPaymentReference = req.body.downPaymentReference || undefined;

      const receiptArray = (req.files && req.files.receipt) || [];
      // Require a receipt when down payment is required
      if (!Array.isArray(receiptArray) || receiptArray.length === 0) {
        return res.status(400).json({ message: 'Down payment receipt is required for bulk orders.' });
      }

      const rf = receiptArray[0];
      const uploadStream = bucket.openUploadStream(rf.originalname, { contentType: rf.mimetype });
      uploadStream.end(rf.buffer);
      const receiptId = await new Promise((resolve, reject) => {
        uploadStream.on('finish', () => resolve(uploadStream.id));
        uploadStream.on('error', reject);
      });
      orderDoc.downPaymentReceipt = receiptId;
      orderDoc.downPaymentPaid = true;
      orderDoc.downPaymentPaidAt = new Date();
    }

    // ✅ NEW: Create temporary order object to validate stock
    const tempOrder = {
      store: store._id,
      items: orderDoc.items
    };
    
    // Validate stock before creating the order
    const stockValidation = await validateAndReserveStock(tempOrder, { checkOnly: true });
    if (stockValidation.stockIssues.length > 0) {
      const issue = stockValidation.stockIssues[0];
      return res.status(400).json({
        message: `Insufficient stock for ${issue.inventoryName || 'item'}. Available: ${issue.available}, Required: ${issue.required}`,
        available: issue.available,
        required: issue.required,
        maxAllowedQuantity: Math.floor(issue.available / (service.inventoryQuantityPerUnit || 1))
      });
    }

    // Create the actual order
    const order = await Order.create(orderDoc);

    // Immediately deduct inventory for confirmed orders
    try {
      await reduceInventoryForOrder(order);
    } catch (invError) {
      // If inventory deduction fails, delete the order and return error
      await Order.findByIdAndDelete(order._id);
      return res.status(400).json({ 
        message: `Order creation failed: ${invError.message}` 
      });
    }

    // ------------------------------
    // Real-time notification section (and save to DB)
    // ------------------------------
    try {
      const io = req.app.get("io");
      const onlineUsers = req.app.get("onlineUsers");

      const ownerId = store.owner?._id?.toString();
      if (ownerId) {
        const notificationPayload = {
          user: store.owner._id,
          type: "owner",
          title: "New Order",
          description: `A new order was placed for ${service.name} (x${qty}).`,
        };

        // Save notification in database
        const notificationDoc = await Notification.create(notificationPayload);

        // Emit to owner if online
        if (onlineUsers[ownerId]) {
          io.to(onlineUsers[ownerId]).emit("newNotification", notificationDoc);
        }
      }
    } catch (notifyErr) {
      console.error("Notification emit error:", notifyErr);
    }

    res.status(201).json(order);
  } catch (err) {
    console.error('createOrder error:', err);
    res.status(500).json({ message: err.message });
  }
};

// ✅ NEW HELPER: Get stock info for all services in a store
exports.getServiceStockInfo = async (req, res) => {
  try {
    const { storeId } = req.params;
    if (!storeId) return res.status(400).json({ message: 'storeId is required' });

    const services = await Service.find({ store: storeId, active: true });
    const stockInfo = await Promise.all(
      services.map(async (service) => {
        let availableStock = null;
        let maxAllowedQuantity = 9999;
        let inventoryItemId = null;
        let inventoryItemName = null;

        if (service.requiredInventory) {
          const inventoryItem = await InventoryItem.findById(service.requiredInventory);
          if (inventoryItem) {
            inventoryItemId = inventoryItem._id;
            inventoryItemName = inventoryItem.name;
            availableStock = inventoryItem.amount;
            maxAllowedQuantity = Math.floor(
              inventoryItem.amount / (service.inventoryQuantityPerUnit || 1)
            );
          }
        } else {
          // Fallback: try to find by service name
          const inventoryItem = await InventoryItem.findOne({ 
            store: storeId, 
            name: service.name 
          });
          if (inventoryItem) {
            inventoryItemId = inventoryItem._id;
            inventoryItemName = inventoryItem.name;
            availableStock = inventoryItem.amount;
            maxAllowedQuantity = Math.floor(inventoryItem.amount);
          }
        }

        return {
          serviceId: service._id,
          serviceName: service.name,
          hasStockLimit: availableStock !== null,
          availableStock,
          maxAllowedQuantity,
          inventoryItemId,
          inventoryItemName,
          inventoryPerUnit: service.inventoryQuantityPerUnit || 1
        };
      })
    );

    res.json({
      success: true,
      storeId,
      stockInfo
    });
  } catch (err) {
    console.error('Error getting service stock info:', err);
    res.status(500).json({ message: err.message });
  }
};

exports.getMyOrders = async (req, res) => {
  try {
    const requester = req.user;
    if (!requester) return res.status(401).json({ message: 'Unauthorized' });
    if (requester.role === 'guest') {
      const orders = await Order.find({ guestId: requester.id }).sort({ createdAt: -1 });
      return res.json(orders);
    }
    const orders = await Order.find({ user: requester.id }).sort({ createdAt: -1 });
    res.json(orders);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getOrdersForStore = async (req, res) => {
  try {
    const { storeId } = req.params;
    const store = await getManagedStore(req, { allowEmployeeRoles: EMPLOYEE_ROLES });
    if (String(store._id) !== String(storeId)) {
      return res.status(403).json({ message: 'Not authorized to access this store' });
    }
    const orders = await Order.find({ store: store._id }).sort({ createdAt: -1 });
    res.json(orders);
  } catch (err) {
    if (err instanceof AccessError) {
      return res.status(err.statusCode).json({ message: err.message });
    }
    res.status(500).json({ message: err.message });
  }
};

exports.getOrderById = async (req, res) => {
  try {
    const { id } = req.params;
    const order = await Order.findById(id);
    if (!order) return res.status(404).json({ message: 'Order not found' });
    res.json(order);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.updateOrderStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status: incomingStatus, paymentStatus, paymentAmount, paymentMethod } = req.body || {};

    // Allow customers/guests to cancel their own orders without requiring store access
    const requester = req.user;
    if (!requester) return res.status(401).json({ message: 'Unauthorized' });
    if (incomingStatus === 'cancelled' && (requester.role === 'customer' || requester.role === 'guest')) {
      const order = await Order.findById(id).populate({ path: 'store', populate: { path: 'owner' } });
      if (!order) return res.status(404).json({ message: 'Order not found' });
      const isOwner = requester.role === 'guest' ? String(order.guestId) === String(requester.id) : String(order.user) === String(requester.id);
      if (!isOwner) return res.status(403).json({ message: 'Not authorized to cancel this order' });

      // Only allow cancelling if not already completed/cancelled
      if (order.status === 'completed' || order.status === 'cancelled') {
        return res.status(400).json({ message: 'Order cannot be cancelled at this stage' });
      }

      order.status = 'cancelled';
      await order.save();

      // Notify store owner about cancellation
      try {
        const io = req.app.get('io');
        const onlineUsers = req.app.get('onlineUsers') || {};
        const ownerId = order.store && order.store.owner ? String(order.store.owner._id || order.store.owner) : null;
        if (ownerId) {
          const customerNotif = await Notification.create({
            user: order.store.owner._id,
            type: 'owner',
            title: `Order Cancelled`,
            description: `Order ${order._id.slice(-6)} was cancelled by the customer.`,
          });
          if (onlineUsers[ownerId]?.socketId) io.to(onlineUsers[ownerId].socketId).emit('newNotification', customerNotif);
        }
      } catch (notifyErr) {
        console.error('Notification emit error:', notifyErr);
      }

      return res.json(order);
    }

    const store = await getManagedStore(req, { allowEmployeeRoles: EMPLOYEE_ROLES });
    const order = await Order.findOne({ _id: id, store: store._id }).populate('store');
    if (!order) return res.status(404).json({ message: 'Order not found' });

    // --- Update status ---
    if (incomingStatus) {
      let newStatus = incomingStatus;
      if (newStatus === 'in progress') newStatus = 'processing';
      order.status = newStatus;

      // Stage timestamps
      if (newStatus === 'processing' && !order.stageTimestamps.processing) order.stageTimestamps.processing = new Date();
      if (newStatus === 'ready' && !order.stageTimestamps.ready) order.stageTimestamps.ready = new Date();
      if (newStatus === 'completed' && !order.stageTimestamps.completed) order.stageTimestamps.completed = new Date();

      const shouldDeduct = !order.inventoryDeducted && ['processing','ready','completed','in progress'].includes(newStatus);
      if (shouldDeduct) {
        try {
          await reduceInventoryForOrder(order);
          order.inventoryDeducted = true;
        } catch (invErr) {
          return res.status(400).json({ message: invErr.message || 'Inventory deduction failed' });
        }
      }

      if (newStatus === 'ready') {
        order.pickupToken = crypto.randomBytes(16).toString('hex');
        order.pickupTokenExpires = new Date(Date.now() + 48 * 60 * 60 * 1000);
        order.pickupVerifiedAt = undefined;
      }
      if (newStatus === 'completed') {
        order.pickupToken = undefined;
        order.pickupTokenExpires = undefined;
        if (!order.pickupVerifiedAt) order.pickupVerifiedAt = new Date();
      }
    }

    const prevPaymentStatus = order.paymentStatus;
    if (paymentStatus) order.paymentStatus = paymentStatus;
    if (typeof paymentAmount === 'number' && paymentAmount >= 0) {
      order.paymentAmount = paymentAmount;
      order.changeGiven = Math.max(0, paymentAmount - (order.subtotal || 0));
    }
    if (paymentMethod) order.paymentMethod = paymentMethod;

    await order.save();


    try {
      const io = req.app.get('io');
      const onlineUsers = req.app.get('onlineUsers') || {};
      const customerId = order.user ? order.user.toString() : null;
      if (customerId) {
        let timeEstimate = '';
        if (order.status === 'processing') timeEstimate = `Estimated completion: ${order.timeEstimates.processing} hours`;
        else if (order.status === 'ready') timeEstimate = 'Ready for pickup!';
        else if (order.status === 'completed') timeEstimate = 'Order completed!';

        const customerNotif = await Notification.create({
          user: customerId,
            type: 'customer',
          title: `Order #${order._id.slice(-6)} status updated`,
          description: `Your order is now marked as "${order.status}". ${timeEstimate}`,
        });
        if (onlineUsers[customerId]?.socketId) io.to(onlineUsers[customerId].socketId).emit('newNotification', customerNotif);
      }

      const paymentJustCompleted = (prevPaymentStatus !== 'paid' && order.paymentStatus === 'paid');
      if (order.paymentStatus === 'paid' && order.status === 'completed') {
        if (!order.receiptIssuedAt) {
          order.receiptIssuedAt = new Date();
          await order.save();
        }
        const payload = {
          orderId: order._id.toString(),
          paymentAmount: order.paymentAmount ?? null,
          changeGiven: order.changeGiven ?? null,
          currency: order.currency || 'PHP',
        };
        const ownerId = order.store && order.store.owner ? String(order.store.owner) : null;
        if (ownerId && onlineUsers[ownerId]?.socketId) io.to(onlineUsers[ownerId].socketId).emit('payment_verified', payload);
        if (order.user && onlineUsers[order.user.toString()]?.socketId) io.to(onlineUsers[order.user.toString()].socketId).emit('receipt_ready', payload);
      }
    } catch (notifyErr) {
      console.error('Notification emit error:', notifyErr);
    }

    res.json(order);
  } catch (err) {
    console.error('updateOrderStatus error:', err);
    if (err instanceof AccessError) {
      return res.status(err.statusCode).json({ message: err.message });
    }
    res.status(500).json({ message: err.message });
  }
};

exports.confirmPickupByToken = async (req, res) => {
  try {
    const { token } = req.params;
    if (!token) return res.status(400).json({ message: 'Token required' });
    const order = await Order.findOne({ pickupToken: token }).populate({ path: 'store', populate: { path: 'owner' } });
    if (!order) return res.status(404).json({ message: 'Invalid token' });
    if (!order.pickupTokenExpires || order.pickupTokenExpires < new Date()) return res.status(400).json({ message: 'Token expired' });

    order.pickupVerifiedAt = new Date();
    order.pickupToken = undefined;
    order.pickupTokenExpires = undefined;
    await order.save();

    try {
      const io = req.app.get('io');
      const onlineUsers = req.app.get('onlineUsers') || {};
      const ownerId = order.store && order.store.owner ? String(order.store.owner._id || order.store.owner) : null;
      if (ownerId && onlineUsers[ownerId]?.socketId) {
        io.to(onlineUsers[ownerId].socketId).emit('payment_required', {
          orderId: order._id.toString(),
          subtotal: order.subtotal,
            currency: order.currency || 'PHP',
          customerId: order.user ? order.user.toString() : null,
        });
      }
    } catch (emitErr) {
      console.error('Failed emitting payment_required:', emitErr);
    }

    res.json({ message: 'Pickup verified. Awaiting payment verification.', order });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.downloadOrderFile = async (req, res) => {
  try {
    const { id, fileId } = req.params;
    const store = await getManagedStore(req, { allowEmployeeRoles: EMPLOYEE_ROLES });
    const order = await Order.findOne({ _id: id, store: store._id });
    if (!order) return res.status(404).json({ message: 'Order not found' });
    const fileMeta = order.files.find((f) => String(f.fileId) === String(fileId));
    if (!fileMeta) return res.status(404).json({ message: 'File not found' });
    const bucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db, { bucketName: 'uploads' });
    res.set('Content-Type', fileMeta.mimeType || 'application/octet-stream');
    res.set('Content-Disposition', `attachment; filename="${fileMeta.filename || 'file'}"`);
    const stream = bucket.openDownloadStream(new mongoose.Types.ObjectId(fileMeta.fileId));
    stream.pipe(res);
    stream.on('error', () => res.status(500).end());
  } catch (err) {
    if (err instanceof AccessError) {
      return res.status(err.statusCode).json({ message: err.message });
    }
    res.status(500).json({ message: err.message });
  }
};

// Download down payment receipt (GridFS file referenced by order.downPaymentReceipt)
exports.downloadDownPaymentReceipt = async (req, res) => {
  try {
    const { id } = req.params;
    const store = await getManagedStore(req, { allowEmployeeRoles: EMPLOYEE_ROLES });
    const order = await Order.findOne({ _id: id, store: store._id });
    if (!order) return res.status(404).json({ message: 'Order not found' });
    if (!order.downPaymentReceipt) return res.status(404).json({ message: 'Down payment receipt not found' });

    const bucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db, { bucketName: 'uploads' });

    // Try to fetch file metadata to get filename and contentType
    const fileId = new mongoose.Types.ObjectId(order.downPaymentReceipt);
    const filesCursor = bucket.find({ _id: fileId }).limit(1);
    const files = await filesCursor.toArray();
    const fileDoc = files && files.length > 0 ? files[0] : null;

    const filename = (fileDoc && fileDoc.filename) || `downpayment-${String(order._id)}.`;
    const contentType = (fileDoc && fileDoc.contentType) || 'application/octet-stream';

    res.set('Content-Type', contentType);
    res.set('Content-Disposition', `attachment; filename="${filename}"`);
    const stream = bucket.openDownloadStream(fileId);
    stream.pipe(res);
    stream.on('error', () => res.status(500).end());
  } catch (err) {
    if (err instanceof AccessError) {
      return res.status(err.statusCode).json({ message: err.message });
    }
    res.status(500).json({ message: err.message });
  }
};

// Preview down payment receipt (inline disposition) -- used by the frontend to preview in a modal
exports.previewDownPaymentReceipt = async (req, res) => {
  try {
    const { id } = req.params;
    const store = await getManagedStore(req, { allowEmployeeRoles: EMPLOYEE_ROLES });
    const order = await Order.findOne({ _id: id, store: store._id });
    if (!order) return res.status(404).json({ message: 'Order not found' });
    if (!order.downPaymentReceipt) return res.status(404).json({ message: 'Down payment receipt not found' });

    const bucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db, { bucketName: 'uploads' });
    const fileId = new mongoose.Types.ObjectId(order.downPaymentReceipt);
    const filesCursor = bucket.find({ _id: fileId }).limit(1);
    const files = await filesCursor.toArray();
    const fileDoc = files && files.length > 0 ? files[0] : null;

    const filename = (fileDoc && fileDoc.filename) || `downpayment-${String(order._id)}.`;
    const contentType = (fileDoc && fileDoc.contentType) || 'application/octet-stream';

    // allow inline preview
    res.set('Content-Type', contentType);
    res.set('Content-Disposition', `inline; filename="${filename}"`);
    const stream = bucket.openDownloadStream(fileId);
    stream.pipe(res);
    stream.on('error', () => res.status(500).end());
  } catch (err) {
    if (err instanceof AccessError) {
      return res.status(err.statusCode).json({ message: err.message });
    }
    res.status(500).json({ message: err.message });
  }
};