const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { signToken } = require('../utils/jwt');
const { audit } = require('../utils/audit');
const { ROLE_HOME, ROLES } = require('../config/rbac');

/**
 * Public sign-up. Only everyday applicants can self-register.
 * Staff accounts (verifier / officer / admin) must be created by an
 * administrator - that is the first strict RBAC rule of the system.
 */
const register = asyncHandler(async (req, res) => {
  const { name, email, password, phone, role } = req.body;

  if (role && role !== ROLES.APPLICANT) {
    throw ApiError.forbidden('Only applicants can sign up on their own. Staff accounts are created by an administrator.');
  }

  const existing = await User.findOne({ email: String(email).toLowerCase() });
  if (existing) throw ApiError.conflict('An account with this email already exists. Try signing in instead.');

  const user = await User.create({ name, email, password, phone, role: ROLES.APPLICANT });
  const token = signToken(user);

  await audit({ req, action: 'auth.register', resource: 'user', resourceId: user._id });

  res.status(201).json({
    success: true,
    message: 'Your account is ready. Welcome aboard!',
    data: { token, user: user.toSafeJSON(), home: ROLE_HOME[user.role] }
  });
});

const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email: String(email).toLowerCase() }).select('+password');
  if (!user || !(await user.comparePassword(password))) {
    throw ApiError.unauthorized('Email or password is incorrect');
  }

  if (user.status !== 'active') {
    throw ApiError.forbidden('Your account is suspended. Please contact the office.');
  }

  user.lastLoginAt = new Date();
  await user.save();

  const token = signToken(user);

  await audit({ req, action: 'auth.login', resource: 'user', resourceId: user._id });

  res.json({
    success: true,
    message: `Welcome back, ${user.name.split(' ')[0]}!`,
    data: { token, user: user.toSafeJSON(), home: ROLE_HOME[user.role] }
  });
});

const me = asyncHandler(async (req, res) => {
  res.json({
    success: true,
    data: { user: req.user.toSafeJSON(), home: ROLE_HOME[req.user.role] }
  });
});

const updateProfile = asyncHandler(async (req, res) => {
  const { name, phone, email } = req.body;

  if (email && String(email).toLowerCase() !== req.user.email) {
    const taken = await User.findOne({ email: String(email).toLowerCase() });
    if (taken) throw ApiError.conflict('This email is already used by another account');
    req.user.email = String(email).toLowerCase();
  }
  if (name) req.user.name = name;
  if (phone !== undefined) req.user.phone = phone;

  await req.user.save();
  await audit({ req, action: 'auth.profile.update', resource: 'user', resourceId: req.user._id });

  res.json({ success: true, message: 'Your details were saved', data: { user: req.user.toSafeJSON() } });
});

const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  const user = await User.findById(req.user._id).select('+password');
  if (!(await user.comparePassword(currentPassword))) {
    throw ApiError.badRequest('Your current password is not correct');
  }

  user.password = newPassword;
  user.tokenVersion = (user.tokenVersion || 0) + 1;
  await user.save();

  await audit({ req, action: 'auth.password.change', resource: 'user', resourceId: user._id });

  res.json({ success: true, message: 'Password updated. Please sign in again on other devices.' });
});

module.exports = { register, login, me, updateProfile, changePassword };
