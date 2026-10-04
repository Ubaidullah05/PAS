/**
 * Plain-English labels used all over the interface, plus the client side
 * mirror of the permission rules. The server is always the final judge -
 * this only decides what we show or hide.
 */

const STATUS = {
  DRAFT: 'draft',
  SUBMITTED: 'submitted',
  VERIFICATION: 'verification_in_progress',
  VERIFIED: 'verified',
  APPROVAL: 'approval_in_progress',
  APPROVED: 'approved',
  ISSUED: 'issued',
  ON_HOLD: 'on_hold',
  REJECTED: 'rejected'
};

const STATUS_INFO = {
  [STATUS.DRAFT]: { label: 'Not sent yet', tone: 'neutral', icon: '📝' },
  [STATUS.SUBMITTED]: { label: 'Waiting for documents check', tone: 'info', icon: '📤' },
  [STATUS.VERIFICATION]: { label: 'Documents being checked', tone: 'info', icon: '🔍' },
  [STATUS.VERIFIED]: { label: 'Documents approved', tone: 'success', icon: '✅' },
  [STATUS.APPROVAL]: { label: 'Officer is reviewing', tone: 'info', icon: '🧑‍✈️' },
  [STATUS.APPROVED]: { label: 'Approved - printing', tone: 'success', icon: '🎉' },
  [STATUS.ISSUED]: { label: 'Passport issued', tone: 'success', icon: '🛂' },
  [STATUS.ON_HOLD]: { label: 'More information needed', tone: 'warning', icon: '⏸️' },
  [STATUS.REJECTED]: { label: 'Rejected', tone: 'danger', icon: '⛔' }
};

const MILESTONES = [
  { status: STATUS.SUBMITTED, label: 'Application submitted' },
  { status: STATUS.VERIFICATION, label: 'Documents being checked' },
  { status: STATUS.VERIFIED, label: 'Documents approved' },
  { status: STATUS.APPROVAL, label: 'Officer review' },
  { status: STATUS.APPROVED, label: 'Passport approved' },
  { status: STATUS.ISSUED, label: 'Passport issued' }
];

const ORDER = [
  STATUS.DRAFT,
  STATUS.SUBMITTED,
  STATUS.VERIFICATION,
  STATUS.VERIFIED,
  STATUS.APPROVAL,
  STATUS.APPROVED,
  STATUS.ISSUED
];

export function statusInfo(status) {
  return STATUS_INFO[status] || { label: status, tone: 'neutral', icon: '•' };
}

export function milestonesFor(application) {
  const history = [application.status, ...(application.statusHistory || []).map((h) => h.status)];
  const reached = history.map((s) => ORDER.indexOf(s)).filter((i) => i >= 0);
  const high = reached.length ? Math.max(...reached) : -1;
  const currentIndex = MILESTONES.findIndex((m) => m.status === application.status);

  return MILESTONES.map((m, index) => {
    const orderIndex = ORDER.indexOf(m.status);
    return {
      ...m,
      done: orderIndex >= 0 && orderIndex <= high,
      current: index === currentIndex
    };
  });
}

export const ROLE_LABELS = {
  applicant: 'Applicant',
  verifier: 'Document Verifier',
  officer: 'Passport Officer',
  admin: 'System Administrator'
};

export const ROLE_HOME = {
  applicant: '/dashboard',
  verifier: '/console/verifications',
  officer: '/console/approvals',
  admin: '/admin'
};

export const DOCUMENT_TYPES = [
  { value: 'photo', label: 'Recent passport photo' },
  { value: 'id_proof', label: 'Identity proof (Aadhaar / PAN / Voter ID)' },
  { value: 'address_proof', label: 'Address proof (electricity bill / bank statement)' },
  { value: 'dob_proof', label: 'Date of birth proof (birth certificate / school record)' },
  { value: 'old_passport', label: 'Old passport copy (renewal only)' },
  { value: 'signature', label: 'Scanned signature' }
];

export const DOCUMENT_LABEL = Object.fromEntries(DOCUMENT_TYPES.map((d) => [d.value, d.label]));

export const SERVICE_LABELS = {
  fresh: 'New passport',
  renewal: 'Renew my passport',
  lost: 'Lost passport',
  damaged: 'Damaged passport'
};

export const PURPOSE_LABELS = {
  submission: 'Hand in documents',
  verification: 'Documents check',
  collection: 'Collect passport'
};

/* ------------------- what each role may do (UI only) ------------------ */

const ROLE_PERMISSIONS = {
  applicant: [
    'application:create',
    'application:read:own',
    'application:read:write_own',
    'application:submit',
    'document:read:own',
    'document:upload',
    'appointment:book',
    'appointment:read:own',
    'dashboard:view:own'
  ],
  verifier: [
    'application:read:any',
    'application:verify',
    'application:reject',
    'application:assign',
    'document:read:any',
    'document:review',
    'appointment:manage',
    'dashboard:view:all',
    'report:view'
  ],
  officer: [
    'application:read:any',
    'application:approve',
    'application:issue',
    'application:reject',
    'document:read:any',
    'document:review',
    'appointment:manage',
    'dashboard:view:all',
    'report:view'
  ],
  admin: [
    'application:create',
    'application:read:own',
    'application:read:write_own',
    'application:submit',
    'application:read:any',
    'application:verify',
    'application:approve',
    'application:issue',
    'application:reject',
    'application:assign',
    'document:read:own',
    'document:upload',
    'document:read:any',
    'document:review',
    'appointment:book',
    'appointment:read:own',
    'appointment:manage',
    'appointment:slots',
    'user:read',
    'user:manage',
    'role:assign',
    'office:manage',
    'dashboard:view:own',
    'dashboard:view:all',
    'report:view',
    'audit:view'
  ]
};

export function can(user, permission) {
  if (!user) return false;
  const list = ROLE_PERMISSIONS[user.role] || [];
  return list.includes(permission);
}

export function formatBytes(bytes) {
  if (!bytes) return '0 KB';
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function formatDate(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function formatDateTime(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}
