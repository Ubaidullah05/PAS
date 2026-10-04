/**
 * RBAC - the single source of truth for "who can do what".
 *
 * Rule of the system: NOTHING is allowed by default.
 * Every role gets an explicit list of permissions and every protected
 * route must name the exact permission it needs.
 */

const ROLES = Object.freeze({
  APPLICANT: 'applicant',
  VERIFIER: 'verifier',
  OFFICER: 'officer',
  ADMIN: 'admin'
});

const ALL_ROLES = Object.freeze(Object.values(ROLES));

const PERMISSIONS = Object.freeze({
  PROFILE_UPDATE: 'profile:update',

  APPLICATION_CREATE: 'application:create',
  APPLICATION_READ_OWN: 'application:read:own',
  APPLICATION_UPDATE_OWN: 'application:read:write_own',
  APPLICATION_SUBMIT: 'application:submit',
  APPLICATION_READ_ANY: 'application:read:any',
  APPLICATION_VERIFY: 'application:verify',
  APPLICATION_APPROVE: 'application:approve',
  APPLICATION_ISSUE: 'application:issue',
  APPLICATION_REJECT: 'application:reject',
  APPLICATION_ASSIGN: 'application:assign',

  DOCUMENT_READ_OWN: 'document:read:own',
  DOCUMENT_UPLOAD: 'document:upload',
  DOCUMENT_READ_ANY: 'document:read:any',
  DOCUMENT_REVIEW: 'document:review',

  APPOINTMENT_BOOK: 'appointment:book',
  APPOINTMENT_READ_OWN: 'appointment:read:own',
  APPOINTMENT_MANAGE: 'appointment:manage',
  APPOINTMENT_SLOT_MANAGE: 'appointment:slots',

  USER_READ: 'user:read',
  USER_MANAGE: 'user:manage',
  ROLE_ASSIGN: 'role:assign',

  OFFICE_MANAGE: 'office:manage',
  DASHBOARD_VIEW_OWN: 'dashboard:view:own',
  DASHBOARD_VIEW_ALL: 'dashboard:view:all',
  REPORT_VIEW: 'report:view',
  AUDIT_VIEW: 'audit:view'
});

const ALL_PERMISSIONS = Object.freeze(Object.values(PERMISSIONS));

/**
 * Permission matrix. Keep it boring and explicit - that is what makes
 * the access control strict and easy to audit.
 */
const ROLE_PERMISSIONS = Object.freeze({
  [ROLES.APPLICANT]: [
    PERMISSIONS.PROFILE_UPDATE,
    PERMISSIONS.APPLICATION_CREATE,
    PERMISSIONS.APPLICATION_READ_OWN,
    PERMISSIONS.APPLICATION_UPDATE_OWN,
    PERMISSIONS.APPLICATION_SUBMIT,
    PERMISSIONS.DOCUMENT_READ_OWN,
    PERMISSIONS.DOCUMENT_UPLOAD,
    PERMISSIONS.APPOINTMENT_BOOK,
    PERMISSIONS.APPOINTMENT_READ_OWN,
    PERMISSIONS.DASHBOARD_VIEW_OWN
  ],
  [ROLES.VERIFIER]: [
    PERMISSIONS.PROFILE_UPDATE,
    PERMISSIONS.APPLICATION_READ_ANY,
    PERMISSIONS.APPLICATION_VERIFY,
    PERMISSIONS.APPLICATION_REJECT,
    PERMISSIONS.APPLICATION_ASSIGN,
    PERMISSIONS.DOCUMENT_READ_ANY,
    PERMISSIONS.DOCUMENT_REVIEW,
    PERMISSIONS.APPOINTMENT_MANAGE,
    PERMISSIONS.DASHBOARD_VIEW_ALL,
    PERMISSIONS.REPORT_VIEW
  ],
  [ROLES.OFFICER]: [
    PERMISSIONS.PROFILE_UPDATE,
    PERMISSIONS.APPLICATION_READ_ANY,
    PERMISSIONS.APPLICATION_APPROVE,
    PERMISSIONS.APPLICATION_ISSUE,
    PERMISSIONS.APPLICATION_REJECT,
    PERMISSIONS.DOCUMENT_READ_ANY,
    PERMISSIONS.DOCUMENT_REVIEW,
    PERMISSIONS.APPOINTMENT_MANAGE,
    PERMISSIONS.DASHBOARD_VIEW_ALL,
    PERMISSIONS.REPORT_VIEW
  ],
  [ROLES.ADMIN]: [
    PERMISSIONS.PROFILE_UPDATE,
    PERMISSIONS.APPLICATION_READ_ANY,
    PERMISSIONS.APPLICATION_VERIFY,
    PERMISSIONS.APPLICATION_APPROVE,
    PERMISSIONS.APPLICATION_ISSUE,
    PERMISSIONS.APPLICATION_REJECT,
    PERMISSIONS.APPLICATION_ASSIGN,
    PERMISSIONS.DOCUMENT_READ_ANY,
    PERMISSIONS.DOCUMENT_REVIEW,
    PERMISSIONS.APPOINTMENT_MANAGE,
    PERMISSIONS.APPOINTMENT_SLOT_MANAGE,
    PERMISSIONS.USER_READ,
    PERMISSIONS.USER_MANAGE,
    PERMISSIONS.ROLE_ASSIGN,
    PERMISSIONS.OFFICE_MANAGE,
    PERMISSIONS.DASHBOARD_VIEW_ALL,
    PERMISSIONS.REPORT_VIEW,
    PERMISSIONS.AUDIT_VIEW
  ]
});

const ROLE_LABELS = Object.freeze({
  [ROLES.APPLICANT]: 'Applicant',
  [ROLES.VERIFIER]: 'Document Verifier',
  [ROLES.OFFICER]: 'Passport Officer',
  [ROLES.ADMIN]: 'System Administrator'
});

const ROLE_HOME = Object.freeze({
  [ROLES.APPLICANT]: '/dashboard',
  [ROLES.VERIFIER]: '/console/verifications',
  [ROLES.OFFICER]: '/console/approvals',
  [ROLES.ADMIN]: '/admin'
});

function isRole(value) {
  return ALL_ROLES.includes(value);
}

function permissionsForRole(role) {
  if (!isRole(role)) return [];
  return [...ROLE_PERMISSIONS[role]];
}

function roleHasPermission(role, permission) {
  if (!isRole(role)) return false;
  return ROLE_PERMISSIONS[role].includes(permission);
}

function userHasPermission(user, permission) {
  if (!user) return false;
  if (user.role === ROLES.ADMIN) {
    // Admin keeps every known permission except unknown strings - this
    // way new permissions are never silently granted to lesser roles.
    return ALL_PERMISSIONS.includes(permission);
  }
  return roleHasPermission(user.role, permission);
}

module.exports = {
  ROLES,
  ALL_ROLES,
  PERMISSIONS,
  ALL_PERMISSIONS,
  ROLE_PERMISSIONS,
  ROLE_LABELS,
  ROLE_HOME,
  isRole,
  permissionsForRole,
  userHasPermission
};
