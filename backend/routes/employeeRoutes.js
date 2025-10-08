const express = require('express');
const { protect } = require('../middleware/authMiddleware');
const {
  listMyEmployees,
  createEmployee,
  updateEmployee,
  deleteEmployee,
  listDeletedEmployees,
  restoreDeletedEmployee,
  purgeDeletedEmployee,
} = require('../controllers/employeeController');

const router = express.Router();

// owner only
router.get('/mine', protect, listMyEmployees);
router.post('/', protect, createEmployee);
router.put('/:id', protect, updateEmployee);
router.delete('/:id', protect, deleteEmployee);
router.get('/deleted', protect, listDeletedEmployees);
router.post('/deleted/:deletedId/restore', protect, restoreDeletedEmployee);
router.delete('/deleted/:deletedId', protect, purgeDeletedEmployee);

module.exports = router;
