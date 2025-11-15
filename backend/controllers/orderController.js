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

async function reduceInventoryForOrder(order) {
  try {
    for (const item of order.items) {
      let reqInvId = item.requiredInventory;
      let qtyPerUnit = item.inventoryQuantityPerUnit;
      const matchedIds = new Set();

      // Load service once for fallbacks and option processing
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

      // New logic: match each selected option's optionName to an inventory item name
      if (Array.isArray(item.selectedOptions)) {
        for (const opt of item.selectedOptions) {
          const optName = opt.optionName || opt.label; // fallback label
          if (!optName) continue;
            const inv = await InventoryItem.findOne({ store: order.store, name: optName });
            if (inv) matchedIds.add(String(inv._id));
        }
      }

      if (matchedIds.size === 0) continue; // nothing to deduct

      // Deduct for each matched inventory item (assume same qtyPerUnit or fallback 1)
      for (const id of matchedIds) {
        const invItem = await InventoryItem.findById(id);
        if (!invItem) continue;
        const perUnit = qtyPerUnit || 1; // default 1 if unspecified
        const quantityToReduce = item.quantity * perUnit;
        if (invItem.amount < quantityToReduce) {
          throw new Error(`Insufficient inventory for ${invItem.name}. Required: ${quantityToReduce}, Available: ${invItem.amount}`);
        }
        invItem.amount = Math.max(0, invItem.amount - quantityToReduce);
        await invItem.save();
      }
    }
  } catch (error) {
    console.error('Error reducing inventory:', error);
    throw error;
  }
}

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
      };

      // Handle file uploads
      const filesMeta = [];
      if (req.files && Array.isArray(req.files) && req.files.length > 0) {
        const bucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db, { bucketName: 'uploads' });
        for (const f of req.files) {
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

      const order = await Order.create(orderDoc);

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
