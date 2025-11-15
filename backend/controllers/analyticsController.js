const Order = require('../models/orderModel');
const Service = require('../models/serviceModel');
const InventoryItem = require('../models/inventoryItemModel');
const { getManagedStore, AccessError } = require('../utils/storeAccess');

const EMPLOYEE_ROLES= ['Operations Manager', 'Front Desk', 'Inventory & Supplies', 'Printer Operator'];

// Get prescriptive sales analysis
async function getPrescriptiveAnalysis(req, res) {
  try {
    const store = await getManagedStore(req, { allowEmployeeRoles: EMPLOYEE_ROLES });

    // Get orders from the last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const orders = await Order.find({
      store: store._id,
      status: { $in: ['completed', 'ready'] },
      createdAt: { $gte: thirtyDaysAgo }
    }).populate('items.service');

    // Analyze service performance
    const serviceStats = {};
    const totalRevenue = orders.reduce((sum, order) => sum + (order.subtotal || 0), 0);

    orders.forEach(order => {
      order.items.forEach(item => {
        const serviceId = item.service._id.toString();
        if (!serviceStats[serviceId]) {
          serviceStats[serviceId] = {
            serviceId,
            serviceName: item.serviceName || item.service.name,
            orderCount: 0,
            revenue: 0,
            avgOrderValue: 0
          };
        }
        serviceStats[serviceId].orderCount += item.quantity;
        serviceStats[serviceId].revenue += item.totalPrice;
      });
    });

    // Calculate averages and percentages
    Object.values(serviceStats).forEach(stat => {
      stat.avgOrderValue = stat.revenue / stat.orderCount;
      stat.revenuePercentage = totalRevenue > 0 ? (stat.revenue / totalRevenue) * 100 : 0;
    });

    // Sort by revenue
    const sortedServices = Object.values(serviceStats)
      .sort((a, b) => b.revenue - a.revenue);

    // Get inventory status for recommendations
    const inventoryItems = await InventoryItem.find({ store: store._id });
    const lowStockItems = inventoryItems.filter(item => item.amount <= item.minAmount);

    // Generate recommendations
    const recommendations = [];

    // Top performing services
    if (sortedServices.length > 0) {
      recommendations.push({
        type: 'top_performer',
        title: 'Top Performing Service',
        description: `${sortedServices[0].serviceName} generated ₱${sortedServices[0].revenue.toLocaleString()} in revenue`,
        priority: 'high',
        action: 'Consider promoting this service or expanding its variants'
      });
    }

    // Low stock recommendations
    if (lowStockItems.length > 0) {
      recommendations.push({
        type: 'low_stock',
        title: 'Low Stock Alert',
        description: `${lowStockItems.length} items are running low on stock`,
        priority: 'high',
        action: 'Restock these items to avoid service disruptions',
        items: lowStockItems.map(item => item.name)
      });
    }

    // Underperforming services
    const underperformingServices = sortedServices.filter(service => 
      service.revenuePercentage < 5 && service.orderCount < 5
    );
    if (underperformingServices.length > 0) {
      recommendations.push({
        type: 'underperforming',
        title: 'Underperforming Services',
        description: `${underperformingServices.length} services have low sales`,
        priority: 'medium',
        action: 'Consider reviewing pricing, marketing, or discontinuing these services',
        services: underperformingServices.map(s => s.serviceName)
      });
    }

    // Seasonal trends (simplified)
    const currentMonth = new Date().getMonth();
    const isHolidaySeason = currentMonth >= 10 || currentMonth <= 1; // Nov-Jan
    if (isHolidaySeason) {
      recommendations.push({
        type: 'seasonal',
        title: 'Holiday Season Opportunity',
        description: 'Consider holiday-themed promotions and services',
        priority: 'medium',
        action: 'Create special holiday packages or discounts'
      });
    }

    res.json({
      summary: {
        totalRevenue,
        totalOrders: orders.length,
        avgOrderValue: orders.length > 0 ? totalRevenue / orders.length : 0,
        topService: sortedServices[0]?.serviceName || 'None',
        lowStockCount: lowStockItems.length
      },
      servicePerformance: sortedServices,
      recommendations,
      period: 'Last 30 days'
    });

  } catch (err) {
    if (err instanceof AccessError) {
      return res.status(err.statusCode).json({ message: err.message });
    }
    res.status(500).json({ message: err.message });
  }
}

// Get best selling services for customer display
async function getBestSellingServices(req, res) {
  try {
    const { storeId } = req.params;
    // Validate storeId
    try {
      if (!storeId || !storeId.match(/^[0-9a-fA-F]{24}$/)) {
        return res.status(400).json({ message: 'Invalid storeId' });
      }
    } catch (_) {
      return res.status(400).json({ message: 'Invalid storeId' });
    }
    
    // Get orders from the last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const orders = await Order.find({
      store: storeId,
      status: { $in: ['completed', 'ready'] },
      createdAt: { $gte: thirtyDaysAgo }
    }).populate('items.service');

    // Count service orders
    const serviceCounts = {};
    orders.forEach(order => {
      (order.items || []).forEach(item => {
        // Derive a safe service identifier
        let serviceId = undefined;
        let serviceName = undefined;
        if (item.service && typeof item.service === 'object' && item.service._id) {
          serviceId = item.service._id.toString();
          serviceName = item.serviceName || item.service.name;
        } else if (item.service) {
          // item.service may be an ObjectId
          try { serviceId = item.service.toString(); } catch (_) { /* ignore */ }
          serviceName = item.serviceName;
        } else {
          serviceName = item.serviceName; // fallback only by name
        }

        // Key by ID if available, else by name to avoid crashing when service was deleted
        const key = serviceId || (serviceName ? `name:${serviceName}` : null);
        if (!key) return; // nothing to aggregate

        if (!serviceCounts[key]) {
          serviceCounts[key] = {
            serviceId: serviceId || undefined,
            serviceName: serviceName || 'Unknown Service',
            orderCount: 0,
            revenue: 0
          };
        }
        serviceCounts[key].orderCount += Number(item.quantity) || 0;
        serviceCounts[key].revenue += Number(item.totalPrice) || 0;
      });
    });

    // Sort by order count and get top 5
    const bestSelling = Object.values(serviceCounts)
      .sort((a, b) => b.orderCount - a.orderCount)
      .slice(0, 5);

    res.json({
      bestSelling,
      period: 'Last 30 days'
    });

  } catch (err) {
    console.error('best-selling analytics error:', err);
    res.status(500).json({ message: err?.message || 'Failed to compute best selling services' });
  }
}

module.exports = {
  getPrescriptiveAnalysis,
  getBestSellingServices
};
