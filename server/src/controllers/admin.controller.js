const User = require('../models/User');
const Office = require('../models/Office');
const Application = require('../models/Application');
const AuditLog = require('../models/AuditLog');
const Appointment = require('../models/AppointmentSlot');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { audit } = require('../utils/audit');
const { notify } = require('../utils/notify');
const { ALL_ROLES, ROLES, PERMISSIONS, ROLE_PERMISSIONS, permissionsForRole, userHasPermission } = require('../config/rbac');

/* ------------------------------ users ------------------------------ */

const listUsers = asyncHandler(async (req, res) => {
  const filter = {};
  if (req.query.role && ALL_ROLES.includes(req.query.role)) filter.role = req.query.role;
  if (req.query.status && ['active', 'suspended'].includes(req.query.status)) filter.status = req.query.status;
  if (req.query.search) {
    const rx = new RegExp(String(req.query.search).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    filter.$or = [{ name: rx }, { email: rx }];
  }

  const users = await User.find(filter).sort('-createdAt').limit(300);
  res.json({ success: true, data: { users: users.map((u) => u.toSafeJSON()) } });
});

const createUser = asyncHandler(async (req, res) => {
  const { name, email, password, phone, role } = req.body;

  if (!ALL_ROLES.includes(role)) {
    throw ApiError.badRequest('Please choose a valid role for this person');
  }

  const existing = await User.findOne({ email: String(email).toLowerCase() });
  if (existing) throw ApiError.conflict('An account with this email already exists');

  const user = await User.create({ name, email, password, phone, role });

  await audit({ req, action: 'admin.user.create', resource: 'user', resourceId: user._id, meta: { role } });
  await notify(user._id, {
    title: 'Your account is ready',
    message: `You now have access as a ${role}. Sign in to get started.`,
    type: 'success'
  });

  res.status(201).json({ success: true, message: 'Account created', data: { user: user.toSafeJSON() } });
});

const updateUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) throw ApiError.notFound('That account was not found');

  const isSelf = String(user._id) === String(req.user._id);

  if (req.body.role !== undefined) {
    if (!userHasPermission(req.user, PERMISSIONS.ROLE_ASSIGN)) {
      throw ApiError.forbidden('Only a user manager can change roles');
    }
    if (!ALL_ROLES.includes(req.body.role)) throw ApiError.badRequest('That role does not exist');
    if (isSelf) throw ApiError.badRequest('You cannot change your own role');
    if (user.role === ROLES.ADMIN && req.body.role !== ROLES.ADMIN) {
      const admins = await User.countDocuments({ role: ROLES.ADMIN, status: 'active' });
      if (admins <= 1) throw ApiError.badRequest('You must keep at least one administrator');
    }
    user.role = req.body.role;
  }

  if (req.body.status !== undefined) {
    if (!['active', 'suspended'].includes(req.body.status)) throw ApiError.badRequest('Unknown account status');
    if (isSelf) throw ApiError.badRequest('You cannot suspend your own account');
    if (req.body.status === 'suspended' && user.role === ROLES.ADMIN) {
      const admins = await User.countDocuments({ role: ROLES.ADMIN, status: 'active' });
      if (admins <= 1) throw ApiError.badRequest('You must keep at least one administrator');
    }
    user.status = req.body.status;
  }

  if (req.body.name) user.name = req.body.name;
  if (req.body.phone !== undefined) user.phone = req.body.phone;

  await user.save();

  await audit({
    req,
    action: 'admin.user.update',
    resource: 'user',
    resourceId: user._id,
    meta: { role: user.role, status: user.status }
  });

  res.json({ success: true, message: 'Account updated', data: { user: user.toSafeJSON() } });
});

const listRoles = asyncHandler(async (req, res) => {
  res.json({
    success: true,
    data: {
      roles: ALL_ROLES.map((role) => ({
        role,
        permissions: permissionsForRole(role),
        count: ROLE_PERMISSIONS[role].length
      }))
    }
  });
});

/* ------------------------------ offices ---------------------------- */

const createOffice = asyncHandler(async (req, res) => {
  const { code, name, city, state, address, phone, openingHour, closingHour } = req.body;
  const existing = await Office.findOne({ code: String(code).toUpperCase() });
  if (existing) throw ApiError.conflict('An office with this code already exists');

  const office = await Office.create({
    code,
    name,
    city,
    state,
    address,
    phone,
    openingHour,
    closingHour
  });

  await audit({ req, action: 'admin.office.create', resource: 'office', resourceId: office._id });

  res.status(201).json({ success: true, message: 'Passport office added', data: { office } });
});

const updateOffice = asyncHandler(async (req, res) => {
  const office = await Office.findById(req.params.id);
  if (!office) throw ApiError.notFound('That passport office was not found');

  ['name', 'city', 'state', 'address', 'phone', 'openingHour', 'closingHour'].forEach((key) => {
    if (req.body[key] !== undefined) office[key] = req.body[key];
  });
  if (req.body.active !== undefined) office.active = Boolean(req.body.active);

  await office.save();
  await audit({ req, action: 'admin.office.update', resource: 'office', resourceId: office._id });

  res.json({ success: true, message: 'Office updated', data: { office } });
});

const deleteOffice = asyncHandler(async (req, res) => {
  const office = await Office.findById(req.params.id);
  if (!office) throw ApiError.notFound('That passport office was not found');

  const inUse = await Application.countDocuments({ office: office._id });
  if (inUse > 0) {
    office.active = false;
    await office.save();
    return res.json({
      success: true,
      message: 'Office has applications on record, so it was switched off instead of deleted',
      data: { office }
    });
  }

  await office.deleteOne();
  await audit({ req, action: 'admin.office.delete', resource: 'office', resourceId: req.params.id });
  return res.json({ success: true, message: 'Office removed' });
});

/* ------------------------------ reports ---------------------------- */

const reports = asyncHandler(async (req, res) => {
  const byStatus = await Application.aggregate([
    { $group: { _id: '$status', count: { $sum: 1 } } },
    { $sort: { count: -1 } }
  ]);

  const byOffice = await Application.aggregate([
    { $match: { office: { $ne: null } } },
    { $group: { _id: '$office', count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $limit: 20 },
    {
      $lookup: { from: 'offices', localField: '_id', foreignField: '_id', as: 'office' }
    },
    { $unwind: { path: '$office', preserveNullAndEmptyArrays: true } },
    { $project: { count: 1, name: '$office.name', city: '$office.city' } }
  ]);

  const byService = await Application.aggregate([
    { $group: { _id: '$serviceType', count: { $sum: 1 } } },
    { $sort: { count: -1 } }
  ]);

  const totals = {
    users: await User.countDocuments(),
    applicants: await User.countDocuments({ role: ROLES.APPLICANT }),
    applications: await Application.countDocuments(),
    offices: await Office.countDocuments({ active: true })
  };

  res.json({ success: true, data: { byStatus, byOffice, byService, totals } });
});

const auditLogs = asyncHandler(async (req, res) => {
  const filter = {};
  if (req.query.resource) filter.resource = req.query.resource;
  if (req.query.action) filter.action = new RegExp(String(req.query.action), 'i');

  const logs = await AuditLog.find(filter)
    .sort('-createdAt')
    .limit(Number(req.query.limit) || 100)
    .populate('actor', 'name email role');

  res.json({ success: true, data: { logs } });
});

module.exports = {
  listUsers,
  createUser,
  updateUser,
  listRoles,
  createOffice,
  updateOffice,
  deleteOffice,
  reports,
  auditLogs
};
