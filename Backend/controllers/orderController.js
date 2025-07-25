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
        console.error('[DEBUG] Error fetching orders:', err);
        res.status(500).json({ error: 'Failed to fetch orders', details: err.message });
    }
};
const Order = require('../models/Order');


const path = require('path');

// Update order status
exports.updateOrderStatus = async (req, res) => {
    const orderId = req.params.id;
    const { status } = req.body;
    const allowedStatuses = ['pending', 'in progress', 'completed'];
    if (!allowedStatuses.includes(status?.toLowerCase())) {
        return res.status(400).json({ error: 'Invalid status value.' });
    }
    try {
        const order = await Order.findById(orderId);
        if (!order) {
            return res.status(404).json({ error: 'Order not found.' });
        }
        order.status = status;
        await order.save();
        res.json({ success: true, order });
    } catch (err) {
        console.error('[DEBUG] Failed to update order status:', err);
        res.status(500).json({ error: 'Failed to update order status', details: err.message });
    }
};

exports.createOrder = async (req, res) => {
    console.log('[DEBUG] Incoming order request:', req.body, req.file);
    try {
        // Parse details from body (may be JSON string or object)
        let details = req.body.details;
        if (typeof details === 'string') {
            try {
                details = JSON.parse(details);
            } catch (e) {
                console.error('[DEBUG] Failed to parse details JSON:', details, e);
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
            console.error('[DEBUG] Missing required fields:', req.body);
            return res.status(400).json({ error: 'Missing required fields: productType, customerName, or quantity.' });
        }
        // For guests, require guestToken; for users, require customerEmail
        if (!customerEmail && !guestToken) {
            console.error('[DEBUG] Missing customerEmail or guestToken:', req.body);
            return res.status(400).json({ error: 'Missing customerEmail or guestToken.' });
        }

        // Normalize productType
        const normalizedType = productType.toLowerCase().replace(/\s/g, '');
        console.log('[DEBUG] Normalized productType:', normalizedType);

        // Product-specific validation and details mapping
        switch (normalizedType) {
            case 'mug':
                if (!details.color || !details.deliveryMethod || !details.paymentMethod) {
                    console.error('[DEBUG] Missing mug order fields:', details);
                    return res.status(400).json({ error: 'Missing required fields for mug order.' });
                }
                break;
            case 'tshirt':
                if (!details.color || !details.size || !details.deliveryMethod || !details.paymentMethod) {
                    console.error('[DEBUG] Missing t-shirt order fields:', details);
                    return res.status(400).json({ error: 'Missing required fields for t-shirt order.' });
                }
                break;
            case 'ecobag':
                if (!details.color || !details.size || !details.deliveryMethod || !details.paymentMethod) {
                    console.error('[DEBUG] Missing eco bag order fields:', details);
                    return res.status(400).json({ error: 'Missing required fields for eco bag order.' });
                }
                break;
            case 'pen':
                if (!details.color || !details.inkType || !details.deliveryMethod || !details.paymentMethod) {
                    console.error('[DEBUG] Missing pen order fields:', details);
                    return res.status(400).json({ error: 'Missing required fields for pen order.' });
                }
                break;
            case 'tarpaulin':
                if (!details.size || !details.deliveryMethod || !details.paymentMethod) {
                    console.error('[DEBUG] Missing tarpaulin order fields:', details);
                    return res.status(400).json({ error: 'Missing required fields for tarpaulin order.' });
                }
                break;
            case 'document':
                if (!details.paperSize || !details.colorMode || !details.printType || !details.deliveryMethod || !details.paymentMethod) {
                    console.error('[DEBUG] Missing document order fields:', details);
                    return res.status(400).json({ error: 'Missing required fields for document order.' });
                }
                break;
            default:
                console.error('[DEBUG] Invalid product type:', productType);
                return res.status(400).json({ error: 'Invalid product type.' });
        }

        // Create and save order
        const order = new Order({
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
            console.log('[DEBUG] Order saved:', order);
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