const express = require('express');
const { protect } = require('../middleware/authMiddleware');
const auditLogger = require('../middleware/auditLogger');
const {
  listMyEmployees,
  createEmployee,
  updateEmployee,
  archiveEmployee,       // Renamed from deleteEmployee
  listArchivedEmployees, // Renamed from listDeletedEmployees
  restoreArchivedEmployee,
  purgeArchivedEmployee,
} = require('../controllers/employeeController');

const router = express.Router();

// Owner Only Routes
router.get('/mine', protect, listMyEmployees);
router.post('/', protect, auditLogger('create', 'Employee'), createEmployee);
router.put('/:id', protect, auditLogger('update', 'Employee'), updateEmployee);

// Use DELETE method for Archive action
router.delete('/:id', protect, auditLogger('archive', 'Employee'), archiveEmployee);

// Archive Routes
router.get('/deleted', protect, listArchivedEmployees);
router.post('/deleted/:deletedId/restore', protect, auditLogger('restore', 'Employee'), restoreArchivedEmployee);
router.delete('/deleted/:deletedId', protect, auditLogger('purge', 'Employee'), purgeArchivedEmployee);

module.exports = router;