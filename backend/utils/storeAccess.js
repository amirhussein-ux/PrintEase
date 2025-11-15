const PrintStore = require('../models/printStoreModel');

class AccessError extends Error {
  constructor(message, statusCode = 403) {
    super(message);
    this.name = 'AccessError';
    this.statusCode = statusCode;
  }
}

async function findStoreByOwner(ownerId) {
  if (!ownerId) {
    throw new AccessError('Owner id is required to resolve store', 400);
  }
  const store = await PrintStore.findOne({ owner: ownerId });
  if (!store) {
    throw new AccessError('No print store found for owner', 404);
  }
  return store;
}

async function findStoreById(storeId) {
  if (!storeId) {
    throw new AccessError('Store id is required', 400);
  }
  const store = await PrintStore.findById(storeId);
  if (!store) {
    throw new AccessError('Assigned store not found', 404);
  }
  return store;
}

/**
 * Resolve the store the current request user is allowed to manage.
 * Owners resolve via their owned store; employees require explicit allow-list for their employee role.
 */
async function getManagedStore(req, { allowEmployeeRoles = [] } = {}) {
  if (!req || !req.user) {
    throw new AccessError('Unauthorized', 401);
  }

  if (req.user.role === 'owner') {
    return findStoreByOwner(req.user.id);
  }

  if (req.user.role === 'employee' && allowEmployeeRoles.includes(req.user.employeeRole)) {
    return findStoreById(req.user.store);
  }

  throw new AccessError('Not authorized to access store resources', 403);
}

module.exports = {
  AccessError,
  getManagedStore,
  findStoreByOwner,
  findStoreById,
};
