const mongoose = require('mongoose');
const Application = require('../models/Application');
const Office = require('../models/Office');
const ApplicationDocument = require('../models/ApplicationDocument');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { audit } = require('../utils/audit');
const { notify } = require('../utils/notify');
const { STATUS, STATUS_LABELS, getTransition, actionRequirements, availableActions, APPLICANT_MILESTONES } = require('../utils/status');
const { PERMISSIONS, userHasPermission, ROLES } = require('../config/rbac');

function ensureOwnerOrPermission(req, application, permission) {
  const isOwner = String(application.applicant?._id || application.applicant) === String(req.user._id);
  if (isOwner) return;
  if (!userHasPermission(req.user, permission)) {
    throw ApiError.forbidden('You can only view your own applications');
  }
}

const canEdit = (application, user) =>
  application.status === STATUS.DRAFT && String(application.applicant) === String(user._id);

/* ------------------------------------------------------------------ */
/* Applicant                                                           */
/* ------------------------------------------------------------------ */

const create = asyncHandler(async (req, res) => {
  const offices = await Office.find({ active: true }).lean();
  const office = offices.length ? offices[0]._id : undefined;

  const application = await Application.create({
    applicant: req.user._id,
    status: STATUS.DRAFT,
    office,
    personal: {},
    contact: { email: req.user.email },
    family: {},
    previousPassport: {},
    declarations: {}
  });

  application.statusHistory.push({
    status: STATUS.DRAFT,
    action: 'create',
    remark: 'Application started',
    by: req.user._id,
    byRole: req.user.role
  });
  await application.save();

  await audit({ req, action: 'application.create', resource: 'application', resourceId: application._id });

  res.status(201).json({
    success: true,
    message: 'New application started. Fill in the details and send it when you are ready.',
    data: { application }
  });
});

const listMine = asyncHandler(async (req, res) => {
  const applications = await Application.find({ applicant: req.user._id })
    .sort('-createdAt')
    .populate('office', 'name city state')
    .lean({ virtuals: false });

  res.json({ success: true, data: { applications, total: applications.length } });
});

const getOne = asyncHandler(async (req, res) => {
  const application = await Application.findById(req.params.id)
    .populate('office', 'name city state address')
    .populate('assignedVerifier', 'name')
    .populate('assignedOfficer', 'name');

  if (!application) throw ApiError.notFound('We could not find that application');

  ensureOwnerOrPermission(req, application, PERMISSIONS.APPLICATION_READ_ANY);

  const documents = await ApplicationDocument.find({ application: application._id })
    .sort('createdAt')
    .lean();

  const reachedIndex = Math.max(
    ...[application.status, ...application.statusHistory.map((h) => h.status)]
      .map((s) => ORDER.indexOf(s))
      .filter((i) => i >= 0),
    -1
  );
  const currentIndex = ORDER.indexOf(application.status) >= 0 ? ORDER.indexOf(application.status) : reachedIndex;

  const milestones = APPLICANT_MILESTONES.map((m) => ({
    ...m,
    done: isAheadOrEqual(application, m.status),
    current: ORDER.indexOf(m.status) === currentIndex
  }));

  res.json({
    success: true,
    data: {
      application,
      documents,
      milestones,
      statusLabel: STATUS_LABELS[application.status],
      owner: String(application.applicant) === String(req.user._id),
      actions: canEdit(application, req.user) ? availableActions(application.status) : []
    }
  });
});

/** Order of the public milestones - used for the progress bar. */
const ORDER = [
  STATUS.DRAFT,
  STATUS.SUBMITTED,
  STATUS.VERIFICATION,
  STATUS.VERIFIED,
  STATUS.APPROVAL,
  STATUS.APPROVED,
  STATUS.ISSUED
];

function isAheadOrEqual(application, target) {
  const reached = [application.status, ...application.statusHistory.map((h) => h.status)]
    .map((s) => ORDER.indexOf(s))
    .filter((i) => i >= 0);
  const ti = ORDER.indexOf(target);
  if (ti < 0 || !reached.length) return false;
  return Math.max(...reached) >= ti;
}

const updateOwn = asyncHandler(async (req, res) => {
  const application = await Application.findById(req.params.id);
  if (!application) throw ApiError.notFound('We could not find that application');
  if (String(application.applicant) !== String(req.user._id)) {
    throw ApiError.forbidden('You can only edit your own applications');
  }
  if (!canEdit(application, req.user)) {
    throw ApiError.badRequest('This application has already been sent, so it can no longer be edited');
  }

  const allowedSections = ['personal', 'contact', 'family', 'previousPassport', 'declarations', 'serviceType', 'category', 'office'];
  for (const key of allowedSections) {
    if (req.body[key] !== undefined) application[key] = req.body[key];
  }

  await application.save();
  await audit({ req, action: 'application.update', resource: 'application', resourceId: application._id });

  res.json({ success: true, message: 'Your changes were saved', data: { application } });
});

const removeOwn = asyncHandler(async (req, res) => {
  const application = await Application.findById(req.params.id);
  if (!application) throw ApiError.notFound('We could not find that application');
  if (String(application.applicant) !== String(req.user._id)) {
    throw ApiError.forbidden('You can only delete your own applications');
  }
  if (application.status !== STATUS.DRAFT) {
    throw ApiError.badRequest('Only applications that were never sent can be deleted');
  }

  await ApplicationDocument.deleteMany({ application: application._id });
  await application.deleteOne();

  await audit({ req, action: 'application.delete', resource: 'application', resourceId: application._id });

  res.json({ success: true, message: 'The draft application was removed' });
});

/* ------------------------------------------------------------------ */
/* Shared workflow engine - used by applicants, verifiers and officers */
/* ------------------------------------------------------------------ */

async function applyTransition(req, res, action) {
  const application = await Application.findById(req.params.id).populate('applicant', 'name email');
  if (!application) throw ApiError.notFound('We could not find that application');

  const move = getTransition(application.status, action);
  const requirements = actionRequirements(action);

  if (!requirements.length) {
    throw ApiError.badRequest('That action is not part of the passport process');
  }

  // RBAC rule 1 + 2 - checked before anything else: is this person's
  // role allowed to do this at all, anywhere in the journey?
  const allowedByRole = requirements.filter(
    (requirement) => requirement.by.includes(req.user.role) && userHasPermission(req.user, requirement.who)
  );
  if (!allowedByRole.length) {
    throw ApiError.forbidden('Your role does not allow you to do this');
  }

  // RBAC rule 3 - applicants may only act on their own records.
  const isOwner = String(application.applicant._id || application.applicant) === String(req.user._id);
  if (req.user.role === ROLES.APPLICANT && !isOwner) {
    throw ApiError.forbidden('You can only work on your own applications');
  }

  // Step check - the right person, but not the right moment.
  if (!move) {
    throw ApiError.badRequest(
      `This action is not allowed while the application is "${STATUS_LABELS[application.status]}"`
    );
  }

  const remark = (req.body.remark || req.body.reason || '').toString().trim().slice(0, 500);

  if (action === 'reject' && !remark) {
    throw ApiError.badRequest('Please write a short reason so the applicant knows what went wrong');
  }

  if (move.destroy) {
    await ApplicationDocument.deleteMany({ application: application._id });
    await application.deleteOne();
    await audit({ req, action: `application.${action}`, resource: 'application', resourceId: req.params.id });
    return res.json({ success: true, message: 'The draft application was removed' });
  }

  const previous = application.status;

  if (action === 'submit') {
    const missing = requiredSectionsMissing(application);
    if (missing.length) {
      throw ApiError.badRequest(`Please complete: ${missing.join(', ')}`);
    }
    if (!application.declarations?.agreesToTerms) {
      throw ApiError.badRequest('Please tick the declaration box before sending your application');
    }
    application.submittedAt = new Date();
  }

  if (action === 'startVerification' || action === 'resumeVerification') {
    application.assignedVerifier = req.user._id;
  }
  if (action === 'startApproval' || action === 'resumeApproval') {
    application.assignedOfficer = req.user._id;
  }

  if (action === 'approveDocuments') application.verification = { remark, by: req.user._id, at: new Date() };
  if (action === 'approve' || action === 'issue') {
    application.approval = { ...application.approval, remark, by: req.user._id, at: new Date() };
    if (action === 'issue') {
      application.approval.passportNumber =
        application.approval.passportNumber || generatePassportNumber();
      application.issuedAt = new Date();
    }
  }
  if (action === 'reject') application.rejectionReason = remark;
  if (action === 'sendBack') {
    application.holdReason = remark || 'More information is needed';
    application.holdReturnTo = previous;
  }
  if (action === 'resumeVerification' || action === 'resumeApproval') {
    application.holdReason = undefined;
    application.holdReturnTo = undefined;
  }

  application.status = move.to;
  application.statusHistory.push({
    status: move.to,
    action,
    remark,
    by: req.user._id,
    byRole: req.user.role
  });

  await application.save();

  await audit({
    req,
    action: `application.${action}`,
    resource: 'application',
    resourceId: application._id,
    meta: { from: previous, to: move.to }
  });

  await notify(application.applicant._id, {
    title: `Update on application ${application.refNo}`,
    message: STATUS_LABELS[move.to],
    type: move.to === STATUS.REJECTED ? 'danger' : move.to === STATUS.ISSUED ? 'success' : 'info',
    link: `/applications/${application._id}`
  });

  res.json({
    success: true,
    message: action === 'issue' ? 'Passport has been issued' : `Application is now: ${STATUS_LABELS[move.to]}`,
    data: { application }
  });
}

function requiredSectionsMissing(application) {
  const missing = [];
  const p = application.personal || {};
  if (!p.firstName || !p.lastName || !p.dob || !p.gender) missing.push('basic details');
  const c = application.contact || {};
  if (!c.email || !c.phone || !c.addressLine || !c.city || !c.state || !c.pincode) missing.push('contact details');
  if (!application.family?.fatherName) missing.push("father's name");
  if (!application.office) missing.push('passport office');
  return missing;
}

function generatePassportNumber() {
  const digits = '0123456789';
  const letters = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  let out = '';
  for (let i = 0; i < 1; i += 1) out += letters[Math.floor(Math.random() * letters.length)];
  for (let i = 0; i < 7; i += 1) out += digits[Math.floor(Math.random() * digits.length)];
  return `P${out}`;
}

/* ------------------------------------------------------------------ */
/* Staff queues                                                        */
/* ------------------------------------------------------------------ */

const queue = asyncHandler(async (req, res) => {
  const queueName = req.query.queue;

  let statuses;
  if (queueName === 'verification') {
    statuses = [STATUS.SUBMITTED, STATUS.VERIFICATION, STATUS.ON_HOLD];
  } else if (queueName === 'approval') {
    statuses = [STATUS.VERIFIED, STATUS.APPROVAL];
  } else {
    throw ApiError.badRequest('Please choose a queue: verification or approval');
  }

  const applications = await Application.find({ status: { $in: statuses } })
    .sort('-createdAt')
    .limit(200)
    .populate('applicant', 'name email')
    .populate('office', 'name city')
    .lean();

  res.json({
    success: true,
    data: { applications, queue: queueName, total: applications.length }
  });
});

const move = asyncHandler(async (req, res) => {
  const action = req.body.action;
  const allowed = [
    'startVerification',
    'approveDocuments',
    'sendBack',
    'reject',
    'startApproval',
    'approve',
    'issue',
    'resumeVerification',
    'resumeApproval'
  ];
  if (!allowed.includes(action)) {
    throw ApiError.badRequest('That action is not part of the passport process');
  }
  return applyTransition(req, res, action);
});

const stats = asyncHandler(async (req, res) => {
  const own = userHasPermission(req.user, PERMISSIONS.DASHBOARD_VIEW_OWN);
  const filter = own && !userHasPermission(req.user, PERMISSIONS.DASHBOARD_VIEW_ALL)
    ? { applicant: req.user._id }
    : {};

  const grouped = await Application.aggregate([
    { $match: filter },
    { $group: { _id: '$status', count: { $sum: 1 } } }
  ]);

  const counts = {};
  Object.values(STATUS).forEach((s) => {
    counts[s] = 0;
  });
  grouped.forEach((g) => {
    counts[g._id] = g.count;
  });

  const total = grouped.reduce((sum, g) => sum + g.count, 0);

  res.json({ success: true, data: { counts, total, scope: filter.applicant ? 'own' : 'all' } });
});

module.exports = {
  create,
  listMine,
  getOne,
  updateOwn,
  removeOwn,
  applyTransition,
  submit: asyncHandler((req, res) => applyTransition(req, res, 'submit')),
  queue,
  move,
  stats
};
