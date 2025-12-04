const express = require('express');
const { protect } = require('../middleware/authMiddleware');
const auditLogger = require('../middleware/auditLogger');
const {
  listMyInventory,
  createItem,
  updateItem,
  archiveItem,        // Renamed from deleteItem
  listByStore,
  listArchivedItems,  // Renamed from listDeletedItems
  restoreArchivedItem, // Renamed from restoreDeletedItem
  purgeArchivedItem,   // Renamed from purgeDeletedItem
  getStockForServices, // ✅ NEW: Get stock for services
  checkStockAvailability, // ✅ NEW: Check stock before ordering
} = require('../controllers/inventoryController');

const router = express.Router();

// Owner Routes
router.get('/mine', protect, listMyInventory);
router.post('/', protect, auditLogger('create', 'Inventory'), createItem);
router.put('/:id', protect, auditLogger('update', 'Inventory'), updateItem);

// Using DELETE method, but logic is Archive
router.delete('/:id', protect, auditLogger('archive', 'Inventory'), archiveItem);

// Archive Routes
router.get('/deleted', protect, listArchivedItems);
router.post('/deleted/:deletedId/restore', protect, auditLogger('restore', 'Inventory'), restoreArchivedItem);
router.delete('/deleted/:deletedId', protect, auditLogger('purge', 'Inventory'), purgeArchivedItem);

// Public Routes
router.get('/store/:storeId', listByStore);

// ✅ NEW ROUTES FOR STOCK MANAGEMENT
// Get stock information for services in a store (public - no auth needed for customers)
router.get('/store/:storeId/stock-for-services', getStockForServices);

// Check stock availability before ordering (public - no auth needed)
router.post('/check-stock-availability', checkStockAvailability);

module.exports = router;