const express = require('express');
const { protect } = require('../middleware/authMiddleware');
const {
  listMyInventory,
  createItem,
  updateItem,
  deleteItem,
  listByStore,
} = require('../controllers/inventoryController');

const router = express.Router();

// owner
router.get('/mine', protect, listMyInventory);
router.post('/', protect, createItem);
router.put('/:id', protect, updateItem);
router.delete('/:id', protect, deleteItem);

// public
router.get('/store/:storeId', listByStore);

module.exports = router;
