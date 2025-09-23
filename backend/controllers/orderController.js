const mongoose = require('mongoose');
const Order = require('../models/orderModel');
const Service = require('../models/serviceModel');
const PrintStore = require('../models/printStoreModel');
const crypto = require('crypto');
const Notification = require('../models/notificationModel');

function computeUnitPrice(service, selectedOptions = []) {
  const base = Number(service.basePrice) || 0;
  const deltas = (selectedOptions || []).reduce((sum, o) => sum + (Number(o.priceDelta) || 0), 0);
  return base + deltas;
}

  exports.createOrder = async (req, res) => {
    try {
      const userId = req.user?.id; // set by auth middleware
      if (!userId) return res.status(401).json({ message: 'Unauthorized' });

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
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });
    const orders = await Order.find({ user: userId }).sort({ createdAt: -1 });
    res.json(orders);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getOrdersForStore = async (req, res) => {
  try {
    const { storeId } = req.params;
    const orders = await Order.find({ store: storeId }).sort({ createdAt: -1 });
    res.json(orders);
  } catch (err) {
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
    const { status, paymentStatus } = req.body || {};
    const order = await Order.findById(id).populate("store");
    if (!order) return res.status(404).json({ message: "Order not found" });

    // --- Update status ---
    if (status) {
      order.status = status;

      // 'ready': create pickup token (48h validity)
      if (status === "ready") {
        order.pickupToken = crypto.randomBytes(16).toString("hex");
        order.pickupTokenExpires = new Date(Date.now() + 48 * 60 * 60 * 1000);
        order.pickupVerifiedAt = undefined;
      }

      // 'completed': clear token
      if (status === "completed") {
        order.pickupToken = undefined;
        order.pickupTokenExpires = undefined;
        if (!order.pickupVerifiedAt) order.pickupVerifiedAt = new Date();
      }
    }

    if (paymentStatus) order.paymentStatus = paymentStatus;

    await order.save();

    // --- Notify customer only ---
    try {
      const io = req.app.get("io");
      const onlineUsers = req.app.get("onlineUsers");
      const customerId = order.user.toString();

      if (customerId) {
        const customerNotif = await Notification.create({
          user: customerId,
          type: "customer", 
          title: `Order #${order._id} status updated`,
          description: `Your order is now marked as "${order.status}".`,
        });

        // Emit in real-time if online
        if (onlineUsers[customerId]) {
          io.to(onlineUsers[customerId]).emit("newNotification", customerNotif);
        }
      }
    } catch (notifyErr) {
      console.error("Notification emit error:", notifyErr);
    }

    res.json(order);
  } catch (err) {
    console.error("updateOrderStatus error:", err);
    res.status(500).json({ message: err.message });
  }
};

// QR shows token; owner scans to confirm
exports.confirmPickupByToken = async (req, res) => {
  try {
    const { token } = req.params;
    if (!token) return res.status(400).json({ message: 'Token required' });
    const order = await Order.findOne({ pickupToken: token });
    if (!order) return res.status(404).json({ message: 'Invalid token' });
    if (!order.pickupTokenExpires || order.pickupTokenExpires < new Date()) {
      return res.status(400).json({ message: 'Token expired' });
    }
    order.status = 'completed';
    order.paymentStatus = 'paid';
    order.pickupVerifiedAt = new Date();
    order.pickupToken = undefined;
    order.pickupTokenExpires = undefined;
    await order.save();
    res.json({ message: 'Pickup confirmed', order });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.downloadOrderFile = async (req, res) => {
  try {
    const { id, fileId } = req.params;
    const order = await Order.findById(id);
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
    res.status(500).json({ message: err.message });
  }
};
