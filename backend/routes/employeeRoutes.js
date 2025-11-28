const express = require('express');
const { protect } = require('../middleware/authMiddleware');
const auditLogger = require('../middleware/auditLogger');
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
router.post('/', protect, auditLogger('create', 'Employee'), createEmployee);
router.put('/:id', protect, auditLogger('update', 'Employee'), updateEmployee);
router.delete('/:id', protect, auditLogger('delete', 'Employee'), deleteEmployee);
router.get('/deleted', protect, listDeletedEmployees);
router.post('/deleted/:deletedId/restore', protect, auditLogger('restore', 'Employee'), restoreDeletedEmployee);
router.delete('/deleted/:deletedId', protect, auditLogger('purge', 'Employee'), purgeDeletedEmployee);

module.exports = router;