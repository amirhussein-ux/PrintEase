const express = require('express');
const { protect } = require('../middleware/authMiddleware');
const {
  listMyEmployees,
  createEmployee,
  updateEmployee,
  deleteEmployee,
} = require('../controllers/employeeController');

const router = express.Router();

// owner only
router.get('/mine', protect, listMyEmployees);
router.post('/', protect, createEmployee);
router.put('/:id', protect, updateEmployee);
router.delete('/:id', protect, deleteEmployee);

module.exports = router;
