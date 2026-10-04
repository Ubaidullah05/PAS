const { PERMISSIONS } = require('../config/rbac');

/**
 * The passport journey, in plain English.
 * Every status change goes through this table, so nothing can jump the
 * queue - not even an admin using a raw API call.
 */
const STATUS = Object.freeze({
  DRAFT: 'draft',
  SUBMITTED: 'submitted',
  VERIFICATION: 'verification_in_progress',
  VERIFIED: 'verified',
  APPROVAL: 'approval_in_progress',
  APPROVED: 'approved',
  ISSUED: 'issued',
  ON_HOLD: 'on_hold',
  REJECTED: 'rejected'
});

const STATUS_LABELS = Object.freeze({
  [STATUS.DRAFT]: 'Draft - not sent yet',
  [STATUS.SUBMITTED]: 'Submitted - waiting for a verifier',
  [STATUS.VERIFICATION]: 'Documents are being checked',
  [STATUS.VERIFIED]: 'Documents approved - waiting for an officer',
  [STATUS.APPROVAL]: 'Officer is reviewing your application',
  [STATUS.APPROVED]: 'Approved - passport is being printed',
  [STATUS.ISSUED]: 'Passport issued - ready for delivery',
  [STATUS.ON_HOLD]: 'On hold - more information is needed',
  [STATUS.REJECTED]: 'Rejected'
});

const STATUS_TONES = Object.freeze({
  [STATUS.DRAFT]: 'neutral',
  [STATUS.SUBMITTED]: 'info',
  [STATUS.VERIFICATION]: 'info',
  [STATUS.VERIFIED]: 'success',
  [STATUS.APPROVAL]: 'info',
  [STATUS.APPROVED]: 'success',
  [STATUS.ISSUED]: 'success',
  [STATUS.ON_HOLD]: 'warning',
  [STATUS.REJECTED]: 'danger'
});

/** Ordered milestones shown to the applicant on the tracking page. */
const APPLICANT_MILESTONES = Object.freeze([
  { status: STATUS.SUBMITTED, label: 'Application submitted' },
  { status: STATUS.VERIFICATION, label: 'Documents being checked' },
  { status: STATUS.VERIFIED, label: 'Documents approved' },
  { status: STATUS.APPROVAL, label: 'Officer review' },
  { status: STATUS.APPROVED, label: 'Passport approved' },
  { status: STATUS.ISSUED, label: 'Passport issued' }
]);

/**
 * who = the permission a user must hold to make the move.
 * to  = the status the application lands on.
 */
const TRANSITIONS = Object.freeze({
  [STATUS.DRAFT]: {
    submit: { to: STATUS.SUBMITTED, who: PERMISSIONS.APPLICATION_SUBMIT, by: ['applicant'] },
    discard: { to: null, who: PERMISSIONS.APPLICATION_UPDATE_OWN, by: ['applicant'], destroy: true }
  },
  [STATUS.SUBMITTED]: {
    startVerification: { to: STATUS.VERIFICATION, who: PERMISSIONS.APPLICATION_VERIFY, by: ['verifier', 'admin'] }
  },
  [STATUS.VERIFICATION]: {
    approveDocuments: { to: STATUS.VERIFIED, who: PERMISSIONS.APPLICATION_VERIFY, by: ['verifier', 'admin'] },
    sendBack: { to: STATUS.ON_HOLD, who: PERMISSIONS.APPLICATION_VERIFY, by: ['verifier', 'admin'] },
    reject: { to: STATUS.REJECTED, who: PERMISSIONS.APPLICATION_REJECT, by: ['verifier', 'admin'] }
  },
  [STATUS.VERIFIED]: {
    startApproval: { to: STATUS.APPROVAL, who: PERMISSIONS.APPLICATION_APPROVE, by: ['officer', 'admin'] }
  },
  [STATUS.APPROVAL]: {
    approve: { to: STATUS.APPROVED, who: PERMISSIONS.APPLICATION_APPROVE, by: ['officer', 'admin'] },
    sendBack: { to: STATUS.ON_HOLD, who: PERMISSIONS.APPLICATION_APPROVE, by: ['officer', 'admin'] },
    reject: { to: STATUS.REJECTED, who: PERMISSIONS.APPLICATION_REJECT, by: ['officer', 'admin'] }
  },
  [STATUS.APPROVED]: {
    issue: { to: STATUS.ISSUED, who: PERMISSIONS.APPLICATION_ISSUE, by: ['officer', 'admin'] }
  },
  [STATUS.ON_HOLD]: {
    resumeVerification: { to: STATUS.VERIFICATION, who: PERMISSIONS.APPLICATION_VERIFY, by: ['verifier', 'admin'] },
    resumeApproval: { to: STATUS.APPROVAL, who: PERMISSIONS.APPLICATION_APPROVE, by: ['officer', 'admin'] }
  },
  [STATUS.ISSUED]: {},
  [STATUS.REJECTED]: {}
});

function getTransition(from, action) {
  const state = TRANSITIONS[from];
  if (!state) return null;
  return state[action] || null;
}

/**
 * Every way this action can be performed anywhere in the journey.
 * Used to answer "is this person allowed to do this at all?" before we
 * answer "is this the right moment for it?".
 */
function actionRequirements(action) {
  return Object.values(TRANSITIONS)
    .map((state) => state[action])
    .filter(Boolean);
}

function availableActions(status) {
  const state = TRANSITIONS[status] || {};
  return Object.keys(state);
}

function isValidTransition(from, action) {
  return Boolean(getTransition(from, action));
}

module.exports = {
  STATUS,
  STATUS_LABELS,
  STATUS_TONES,
  APPLICANT_MILESTONES,
  TRANSITIONS,
  getTransition,
  actionRequirements,
  availableActions,
  isValidTransition
};
