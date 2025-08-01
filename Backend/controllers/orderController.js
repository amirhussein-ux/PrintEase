// Fetch orders for a user or guest
exports.getOrdersForUserOrGuest = async (req, res) => {
    try {
        const { customerEmail, guestToken } = req.query;
        let filter = {};
        if (customerEmail) {
            filter.customerEmail = customerEmail;
        } else if (guestToken) {
            filter.guestToken = guestToken;
        }
        // If neither is provided, return all orders (admin)
        const orders = await Order.find(filter).sort({ createdAt: -1 });
        res.json(orders);
    } catch (err) {
        // Error fetching orders
        res.status(500).json({ error: 'Failed to fetch orders', details: err.message });
    }
};
const Order = require('../models/Order');


const path = require('path');
const fetch = require('node-fetch');

// Update order status
exports.updateOrderStatus = async (req, res) => {
    let id = req.params.id;
    // Normalize id for orderId search: remove all non-digit characters
    let normalizedOrderId = id.replace(/\D/g, '');
    const { status } = req.body;
    const allowedStatuses = ['pending', 'in progress', 'completed', 'for pick-up', 'quality check'];
    if (!allowedStatuses.includes(status?.toLowerCase())) {
        return res.status(400).json({ error: 'Invalid status value.' });
    }
    try {
        // Try to find by _id first
        let order = null;
        if (/^[a-fA-F0-9]{24}$/.test(id)) {
            order = await Order.findById(id);
        }
        // If not found, try to find by normalized orderId (digits only)
        if (!order) {
            order = await Order.findOne({ orderId: normalizedOrderId });
        }
        if (!order) {
            return res.status(404).json({ error: 'Order not found.' });
        }
        order.status = status;
        await order.save();
        // Send notification to customer (if customerEmail or guestToken exists)
        try {
            let notification = {
                title: 'Order Status Updated',
                message: `Your order #${order.orderId} status is now: ${status.charAt(0).toUpperCase() + status.slice(1)}`,
                orderId: order.orderId,
                userType: 'customer',
                type: 'info',
                time: new Date().toISOString(),
            };
            let notifyUrl = 'http://localhost:8000/api/notifications';
            let notifyBody = null;
            if (order.customerEmail) {
                notifyBody = { ...notification, recipient: order.customerEmail };
            } else if (order.guestToken) {
                notifyBody = { ...notification, recipient: order.guestToken };
            }
            if (notifyBody) {
                const notifyRes = await fetch(notifyUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(notifyBody)
                });
                const notifyResText = await notifyRes.text();
            } else {
            }
        } catch (notifyErr) {
            // Failed to send notification
        }
        res.json({ success: true, order });
    } catch (err) {
        // Failed to update order status
        res.status(500).json({ error: 'Failed to update order status', details: err.message });
    }
};

exports.createOrder = async (req, res) => {
    try {
        // Parse details from body (may be JSON string or object)
        let details = req.body.details;
        if (typeof details === 'string') {
            try {
                details = JSON.parse(details);
            } catch (e) {
                // Failed to parse details JSON
                details = {};
            }
        }
        if (!details) details = {};

        // If file uploaded, add file path to details
        if (req.file) {
            details.designFile = req.file.filename;
        }

        // Common required fields
        const { productType, customerName, customerEmail, guestToken, quantity, status } = req.body;
        if (!productType || !customerName || !quantity) {
            // Missing required fields
            return res.status(400).json({ error: 'Missing required fields: productType, customerName, or quantity.' });
        }
        // For guests, require guestToken; for users, require customerEmail
        if (!customerEmail && !guestToken) {
            // Missing customerEmail or guestToken
            return res.status(400).json({ error: 'Missing customerEmail or guestToken.' });
        }

        // Normalize productType
        const normalizedType = productType.toLowerCase().replace(/\s/g, '');

        // Product-specific validation and details mapping
        switch (normalizedType) {
            case 'mug':
                if (!details.color || !details.deliveryMethod || !details.paymentMethod) {
                    // Missing mug order fields
                    return res.status(400).json({ error: 'Missing required fields for mug order.' });
                }
                break;
            case 'tshirt':
                if (!details.color || !details.size || !details.deliveryMethod || !details.paymentMethod) {
                    // Missing t-shirt order fields
                    return res.status(400).json({ error: 'Missing required fields for t-shirt order.' });
                }
                break;
            case 'ecobag':
                if (!details.color || !details.size || !details.deliveryMethod || !details.paymentMethod) {
                    // Missing eco bag order fields
                    return res.status(400).json({ error: 'Missing required fields for eco bag order.' });
                }
                break;
            case 'pen':
                if (!details.color || !details.inkType || !details.deliveryMethod || !details.paymentMethod) {
                    // Missing pen order fields
                    return res.status(400).json({ error: 'Missing required fields for pen order.' });
                }
                break;
            case 'tarpaulin':
                if (!details.size || !details.deliveryMethod || !details.paymentMethod) {
                    // Missing tarpaulin order fields
                    return res.status(400).json({ error: 'Missing required fields for tarpaulin order.' });
                }
                break;
            case 'document':
                if (!details.paperSize || !details.colorMode || !details.printType || !details.deliveryMethod || !details.paymentMethod) {
                    // Missing document order fields
                    return res.status(400).json({ error: 'Missing required fields for document order.' });
                }
                break;
            default:
                // Invalid product type
                return res.status(400).json({ error: 'Invalid product type.' });
        }

        // Generate normalized orderId: timestamp + random (no OORD, no spaces)
        const generateOrderId = () => {
            const now = Date.now();
            const rand = Math.floor(Math.random() * 10000);
            return `${now}${rand}`;
        };

        const order = new Order({
            orderId: generateOrderId(),
            customerName,
            customerEmail,
            guestToken,
            productType: normalizedType,
            quantity,
            details,
            status: status || 'pending',
        });
        try {
            await order.save();

            // --- Send notification to admin ---
            try {
                const adminNotification = {
                    title: 'New Order Placed',
                    message: `A new order (#${order.orderId}) has been placed by ${order.customerName || order.customerEmail || 'Guest'}.`,
                    orderId: order.orderId,
                    userType: 'admin',
                    type: 'info',
                    time: new Date().toISOString(),
                    recipient: 'admin', // You can use a static recipient or a list if you have multiple admins
                };
                const notifyUrl = 'http://localhost:8000/api/notifications';
                const notifyRes = await fetch(notifyUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(adminNotification)
                });
                const notifyResText = await notifyRes.text();
                console.log('[DEBUG] Admin notification response:', notifyRes.status, notifyResText);
            } catch (adminNotifyErr) {
                console.error('[DEBUG] Failed to send admin notification:', adminNotifyErr);
            }
            // --- End admin notification ---

            res.status(201).json(order);
        } catch (err) {
            console.error('[DEBUG] Error saving order:', err);
            res.status(500).json({ error: 'Failed to save order', details: err.message });
        }
    } catch (error) {
        console.error('[DEBUG] Order creation error:', error);
        res.status(400).json({ error: error.message });
    }
};