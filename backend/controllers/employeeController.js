const Employee = require('../models/employeeModel');
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
    const deleted = await Employee.findOneAndDelete({ _id: id, store: store._id });
    if (!deleted) return res.status(404).json({ message: 'Employee not found' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
