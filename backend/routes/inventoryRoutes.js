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

module.exports = router;