const express = require('express');
const { protect } = require('../middleware/authMiddleware');
const auditLogger = require('../middleware/auditLogger');
const {
  listMyInventory,
  createItem,
  updateItem,
  deleteItem,
  listByStore,
  listDeletedItems,
  restoreDeletedItem,
  purgeDeletedItem,
} = require('../controllers/inventoryController');

const router = express.Router();

// owner
router.get('/mine', protect, listMyInventory);
router.post('/', protect, auditLogger('create', 'Inventory'), createItem);
router.put('/:id', protect, auditLogger('update', 'Inventory'), updateItem);
router.delete('/:id', protect, auditLogger('delete', 'Inventory'), deleteItem);
router.get('/deleted', protect, listDeletedItems);
router.post('/deleted/:deletedId/restore', protect, auditLogger('restore', 'Inventory'), restoreDeletedItem);
router.delete('/deleted/:deletedId', protect, auditLogger('purge', 'Inventory'), purgeDeletedItem);

// public
router.get('/store/:storeId', listByStore);

module.exports = router;