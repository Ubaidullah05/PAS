const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const { verifyToken } = require('../utils/jwt');
const { userHasPermission, isRole, ROLES } = require('../config/rbac');

/**
 * Step 1 - confirm who you are.
 * Reads the bearer token, loads the user and puts it on req.user.
 */
async function authenticate(req, res, next) {
  try {
    const header = req.headers.authorization || '';
    if (!header.startsWith('Bearer ')) {
      throw ApiError.unauthorized('You need to sign in to continue');
    }

    const payload = verifyToken(header.slice(7).trim());
    const user = await User.findById(payload.sub).select('+password +tokenVersion');

    if (!user || user.status !== 'active') {
      throw ApiError.unauthorized('Your account is not active. Please contact support.');
    }

    if (typeof user.tokenVersion === 'number' && payload.tv !== undefined && payload.tv !== user.tokenVersion) {
      throw ApiError.unauthorized('Your session has expired. Please sign in again.');
    }

    req.user = user;
    next();
  } catch (err) {
    if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
      return next(ApiError.unauthorized('Your session has expired. Please sign in again.'));
    }
    next(err);
  }
}

/**
 * Optional version of authenticate - used on public pages that show
 * different content when a user happens to be signed in.
 */
async function optionalAuth(req, res, next) {
  const header = req.headers.authorization || '';
  if (!header.startsWith('Bearer ')) return next();
  try {
    const payload = verifyToken(header.slice(7).trim());
    const user = await User.findById(payload.sub);
    if (user && user.status === 'active') req.user = user;
  } catch (err) {
    // Public route - a bad token must never break it.
  }
  return next();
}

/**
 * Step 2 - strict Role Based Access Control.
 * Usage: router.use(authorize(PERMISSIONS.USER_MANAGE))
 *
 * Denies by default. Unknown roles and unknown permissions are refused.
 */
function authorize(...requiredPermissions) {
  return (req, res, next) => {
    if (!req.user) return next(ApiError.unauthorized('You need to sign in to continue'));

    const { role } = req.user;
    if (!isRole(role)) {
      return next(ApiError.forbidden('Your account has an unrecognised role'));
    }

    // Admins are never allowed to act on behalf of system level routes
    // unless they hold the permission - checked below like everyone else.
    const missing = requiredPermissions.filter((permission) => !userHasPermission(req.user, permission));

    if (missing.length) {
      return next(
        ApiError.forbidden(
          'Your role does not allow you to do this. Please contact your administrator if you think this is a mistake.'
        )
      );
    }

    req.grantedPermissions = requiredPermissions;
    next();
  };
}

/** Step 3 - only allow certain roles, even if permissions overlap. */
function allowRoles(...roles) {
  return (req, res, next) => {
    if (!req.user) return next(ApiError.unauthorized('You need to sign in to continue'));
    if (!roles.includes(req.user.role)) {
      return next(ApiError.forbidden('This area is only available to specific roles'));
    }
    next();
  };
}

/**
 * Step 4 - ownership rule: an applicant may only touch their own records.
 * Officers and admins (with the "read any" permission) may look at all.
 */
function requireSelfOrPermission(req, resourceOwnerId, permission) {
  const isOwner = String(resourceOwnerId) === String(req.user._id);
  if (isOwner) return true;
  return userHasPermission(req.user, permission);
}

module.exports = { authenticate, optionalAuth, authorize, allowRoles, requireSelfOrPermission, ROLES };
