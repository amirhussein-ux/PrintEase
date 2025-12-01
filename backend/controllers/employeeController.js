const Employee = require('../models/employeeModel');
const DeletedEmployee = require('../models/deletedEmployeeModel');
const PrintStore = require('../models/printStoreModel');
const bcrypt = require('bcryptjs');
const { getManagedStore, AccessError } = require('../utils/storeAccess');

const normalizeEmail = (email) => (typeof email === 'string' ? email.trim().toLowerCase() : '');

const ensureOwnerUser = (req) => {
  if (!req.user || req.user.role !== 'owner') {
    const err = new Error('Only store owners can manage employees');
    err.statusCode = 403;
    throw err;
  }
  return req.user.id;
};

const sanitizeEmployee = (doc) => {
  if (!doc) return null;
  const plain = typeof doc.toObject === 'function' ? doc.toObject() : { ...doc };
  if (Object.prototype.hasOwnProperty.call(plain, 'passwordHash')) {
    delete plain.passwordHash;
  }
  return plain;
};

async function getOwnerStore(req) {
  const ownerId = ensureOwnerUser(req);
  return PrintStore.findOne({ owner: ownerId });
}

exports.listMyEmployees = async (req, res) => {
  try {
    const store = await getManagedStore(req, { allowEmployeeRoles: ['Operations Manager', 'Front Desk', 'Inventory & Supplies', 'Printer Operator'] });
    if (!store) return res.status(404).json({ message: 'No print store found for owner' });
    const employees = await Employee.find({ store: store._id }).sort({ createdAt: -1 });
    res.json(employees);
  } catch (err) {
    if (err instanceof AccessError) {
      return res.status(err.statusCode).json({ message: err.message });
    }
    const status = err.statusCode || 500;
    res.status(status).json({ message: err.message });
  }
};

exports.createEmployee = async (req, res) => {
  try {
    const store = await getOwnerStore(req);
    if (!store) return res.status(404).json({ message: 'No print store found for owner' });
    const { fullName, role, email, phone, password, avatar } = req.body;

    if (!fullName || !String(fullName).trim()) {
      return res.status(400).json({ message: 'Full name is required' });
    }
    if (!role || !String(role).trim()) {
      return res.status(400).json({ message: 'Role is required' });
    }
    if (!email || !String(email).trim()) {
      return res.status(400).json({ message: 'Employee email is required' });
    }
    const normalizedEmail = normalizeEmail(email);
    if (!password || !String(password).trim()) {
      return res.status(400).json({ message: 'A password is required for employees' });
    }
    const passwordValue = String(password).trim();
    if (passwordValue.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters' });
    }

    const passwordHash = await bcrypt.hash(passwordValue, 10);

    const doc = await Employee.create({
      store: store._id,
      fullName: String(fullName).trim(),
      role: String(role).trim(),
      email: normalizedEmail,
      phone: phone ? String(phone).trim() : undefined,
      passwordHash,
      avatar: avatar === '' ? undefined : avatar,
    });
    res.status(201).json(sanitizeEmployee(doc));
  } catch (err) {
    if (err && err.code === 11000) {
      const message = err?.keyPattern?.email ? 'Employee with this email already exists' : 'Employee with this name already exists';
      return res.status(409).json({ message });
    }
    const status = err.statusCode || 500;
    res.status(status).json({ message: err.message });
  }
};

exports.updateEmployee = async (req, res) => {
  try {
    const store = await getOwnerStore(req);
    if (!store) return res.status(404).json({ message: 'No print store found for owner' });
    const { id } = req.params;
    const employee = await Employee.findOne({ _id: id, store: store._id });
    if (!employee) return res.status(404).json({ message: 'Employee not found' });

    const { fullName, role, email, phone, active, password, avatar } = req.body;
    if (fullName !== undefined) employee.fullName = String(fullName).trim();
    if (role !== undefined) employee.role = String(role).trim();
    if (email !== undefined) {
      if (!email || !String(email).trim()) {
        return res.status(400).json({ message: 'Employee email is required' });
      }
      employee.email = normalizeEmail(email);
    }
    if (phone !== undefined) employee.phone = phone ? String(phone).trim() : undefined;
    if (active !== undefined) employee.active = Boolean(active);
    if (password !== undefined) {
      const trimmed = String(password).trim();
      if (trimmed) {
        if (trimmed.length < 6) {
          return res.status(400).json({ message: 'Password must be at least 6 characters' });
        }
        employee.passwordHash = await bcrypt.hash(trimmed, 10);
      }
    }
    if (avatar !== undefined) {
      employee.avatar = avatar === '' ? undefined : avatar;
    }

    await employee.save();
    res.json(sanitizeEmployee(employee));
  } catch (err) {
    if (err && err.code === 11000) {
      const message = err?.keyPattern?.email ? 'Employee with this email already exists' : 'Employee with this name already exists';
      return res.status(409).json({ message });
    }
    const status = err.statusCode || 500;
    res.status(status).json({ message: err.message });
  }
};

exports.deleteEmployee = async (req, res) => {
  try {
    const store = await getOwnerStore(req);
    if (!store) return res.status(404).json({ message: 'No print store found for owner' });
    const { id } = req.params;
    const employee = await Employee.findOne({ _id: id, store: store._id }).select('+passwordHash');
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
      passwordHash: employee.passwordHash,
      avatar: employee.avatar,
    };

    const archived = await DeletedEmployee.findOneAndUpdate(
      { store: store._id, originalId: employee._id },
      archivedPayload,
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    await employee.deleteOne();

    res.json({ success: true, archived: sanitizeEmployee(archived) });
  } catch (err) {
    const status = err.statusCode || 500;
    res.status(status).json({ message: err.message });
  }
};

exports.listDeletedEmployees = async (req, res) => {
  try {
    const store = await getOwnerStore(req);
    if (!store) return res.status(404).json({ message: 'No print store found for owner' });
    const employees = await DeletedEmployee.find({ store: store._id }).sort({ deletedAt: -1 });
    res.json(employees);
  } catch (err) {
    const status = err.statusCode || 500;
    res.status(status).json({ message: err.message });
  }
};

exports.restoreDeletedEmployee = async (req, res) => {
  try {
    const store = await getOwnerStore(req);
    if (!store) return res.status(404).json({ message: 'No print store found for owner' });
    const { deletedId } = req.params;
    const archived = await DeletedEmployee.findOne({ _id: deletedId, store: store._id }).select('+passwordHash');
    if (!archived) return res.status(404).json({ message: 'Archived employee not found' });
    if (!archived.passwordHash) {
      return res.status(400).json({ message: 'Archived employee is missing credentials. Please recreate this employee.' });
    }

    const payload = {
      _id: archived.originalId,
      store: store._id,
      fullName: archived.fullName,
      role: archived.role,
      email: archived.email,
      phone: archived.phone,
      active: archived.active,
      passwordHash: archived.passwordHash,
      avatar: archived.avatar,
    };

    let restored;
    try {
      restored = await Employee.create(payload);
    } catch (err) {
      if (err && err.code === 11000) {
        const message = err?.keyPattern?.email
          ? 'An active employee with this email already exists'
          : 'An active employee with this name already exists';
        return res.status(409).json({ message });
      }
      throw err;
    }

    await archived.deleteOne();

    res.json(sanitizeEmployee(restored));
  } catch (err) {
    const status = err.statusCode || 500;
    res.status(status).json({ message: err.message });
  }
};

exports.purgeDeletedEmployee = async (req, res) => {
  try {
    const store = await getOwnerStore(req);
    if (!store) return res.status(404).json({ message: 'No print store found for owner' });
    const { deletedId } = req.params;
    const archived = await DeletedEmployee.findOneAndDelete({ _id: deletedId, store: store._id });
    if (!archived) return res.status(404).json({ message: 'Archived employee not found' });
    res.json({ success: true });
  } catch (err) {
    const status = err.statusCode || 500;
    res.status(status).json({ message: err.message });
  }
};
