const Employee = require('../models/employeeModel');
const DeletedEmployee = require('../models/deletedEmployeeModel');
const PrintStore = require('../models/printStoreModel');

async function getOwnerStore(userId) {
  return PrintStore.findOne({ owner: userId });
}

exports.listMyEmployees = async (req, res) => {
  try {
    const store = await getOwnerStore(req.user.id);
    if (!store) return res.status(404).json({ message: 'No print store found for owner' });
    const employees = await Employee.find({ store: store._id }).sort({ createdAt: -1 });
    res.json(employees);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.createEmployee = async (req, res) => {
  try {
    const store = await getOwnerStore(req.user.id);
    if (!store) return res.status(404).json({ message: 'No print store found for owner' });
    const { fullName, role, email, phone } = req.body;
    const doc = await Employee.create({
      store: store._id,
      fullName: (fullName || '').trim(),
      role: (role || '').trim(),
      email: email ? email.trim().toLowerCase() : undefined,
      phone: phone ? phone.trim() : undefined,
    });
    res.status(201).json(doc);
  } catch (err) {
    if (err && err.code === 11000) {
      return res.status(409).json({ message: 'Employee with this name already exists' });
    }
    res.status(500).json({ message: err.message });
  }
};

exports.updateEmployee = async (req, res) => {
  try {
    const store = await getOwnerStore(req.user.id);
    if (!store) return res.status(404).json({ message: 'No print store found for owner' });
    const { id } = req.params;
    const employee = await Employee.findOne({ _id: id, store: store._id });
    if (!employee) return res.status(404).json({ message: 'Employee not found' });

    const { fullName, role, email, phone, active } = req.body;
    if (fullName !== undefined) employee.fullName = String(fullName).trim();
    if (role !== undefined) employee.role = String(role).trim();
    if (email !== undefined) employee.email = email ? email.trim().toLowerCase() : undefined;
    if (phone !== undefined) employee.phone = phone ? phone.trim() : undefined;
    if (active !== undefined) employee.active = Boolean(active);

    await employee.save();
    res.json(employee);
  } catch (err) {
    if (err && err.code === 11000) {
      return res.status(409).json({ message: 'Employee with this name already exists' });
    }
    res.status(500).json({ message: err.message });
  }
};

exports.deleteEmployee = async (req, res) => {
  try {
    const store = await getOwnerStore(req.user.id);
    if (!store) return res.status(404).json({ message: 'No print store found for owner' });
    const { id } = req.params;
    const employee = await Employee.findOne({ _id: id, store: store._id });
    if (!employee) return res.status(404).json({ message: 'Employee not found' });

    const archivedPayload = {
      store: store._id,
      originalId: employee._id,
      fullName: employee.fullName,
      role: employee.role,
      email: employee.email,
      phone: employee.phone,
      active: employee.active,
      deletedAt: new Date(),
    };

    const archived = await DeletedEmployee.findOneAndUpdate(
      { store: store._id, originalId: employee._id },
      archivedPayload,
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    await employee.deleteOne();

    res.json({ success: true, archived });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.listDeletedEmployees = async (req, res) => {
  try {
    const store = await getOwnerStore(req.user.id);
    if (!store) return res.status(404).json({ message: 'No print store found for owner' });
    const employees = await DeletedEmployee.find({ store: store._id }).sort({ deletedAt: -1 });
    res.json(employees);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.restoreDeletedEmployee = async (req, res) => {
  try {
    const store = await getOwnerStore(req.user.id);
    if (!store) return res.status(404).json({ message: 'No print store found for owner' });
    const { deletedId } = req.params;
    const archived = await DeletedEmployee.findOne({ _id: deletedId, store: store._id });
    if (!archived) return res.status(404).json({ message: 'Archived employee not found' });

    const payload = {
      _id: archived.originalId,
      store: store._id,
      fullName: archived.fullName,
      role: archived.role,
      email: archived.email,
      phone: archived.phone,
      active: archived.active,
    };

    let restored;
    try {
      restored = await Employee.create(payload);
    } catch (err) {
      if (err && err.code === 11000) {
        return res.status(409).json({ message: 'An active employee with this name already exists' });
      }
      throw err;
    }

    await archived.deleteOne();

    res.json(restored);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.purgeDeletedEmployee = async (req, res) => {
  try {
    const store = await getOwnerStore(req.user.id);
    if (!store) return res.status(404).json({ message: 'No print store found for owner' });
    const { deletedId } = req.params;
    const archived = await DeletedEmployee.findOneAndDelete({ _id: deletedId, store: store._id });
    if (!archived) return res.status(404).json({ message: 'Archived employee not found' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
