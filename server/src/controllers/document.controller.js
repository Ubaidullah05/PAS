const path = require('path');
const fs = require('fs');
const Application = require('../models/Application');
const ApplicationDocument = require('../models/ApplicationDocument');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { audit } = require('../utils/audit');
const { notify } = require('../utils/notify');
const { uploadRoot, removeFile } = require('../utils/upload');
const { DOCUMENT_TYPE_VALUES } = require('../config/constants');
const { userHasPermission, PERMISSIONS, ROLES } = require('../config/rbac');
const { STATUS } = require('../utils/status');

const OWNABLE = [STATUS.DRAFT, STATUS.SUBMITTED, STATUS.VERIFICATION, STATUS.ON_HOLD];

async function loadOwnedApplication(req) {
  const application = await Application.findById(req.params.id);
  if (!application) throw ApiError.notFound('We could not find that application');
  const isOwner = String(application.applicant) === String(req.user._id);
  if (!isOwner && !userHasPermission(req.user, PERMISSIONS.DOCUMENT_READ_ANY)) {
    throw ApiError.forbidden('You can only manage documents on your own application');
  }
  return { application, isOwner };
}

const uploadDocument = asyncHandler(async (req, res) => {
  const { application, isOwner } = await loadOwnedApplication(req);

  if (!isOwner) throw ApiError.forbidden('Only the applicant can upload documents');
  if (!OWNABLE.includes(application.status)) {
    throw ApiError.badRequest('Documents can no longer be changed for this application');
  }
  if (!req.file) throw ApiError.badRequest('Please choose a file to upload');
  if (!DOCUMENT_TYPE_VALUES.includes(req.body.type)) {
    removeFile(req.file.filename);
    throw ApiError.badRequest('Please tell us what kind of document this is');
  }

  const doc = await ApplicationDocument.create({
    application: application._id,
    owner: req.user._id,
    type: req.body.type,
    originalName: req.file.originalname,
    fileName: req.file.filename,
    mimeType: req.file.mimetype,
    size: req.file.size
  });

  await audit({
    req,
    action: 'document.upload',
    resource: 'document',
    resourceId: doc._id,
    meta: { application: application.refNo, type: doc.type }
  });

  res.status(201).json({ success: true, message: 'Document uploaded', data: { document: doc } });
});

const listForApplication = asyncHandler(async (req, res) => {
  const { application } = await loadOwnedApplication(req);
  const documents = await ApplicationDocument.find({ application: application._id }).sort('createdAt');
  res.json({ success: true, data: { documents } });
});

const removeDocument = asyncHandler(async (req, res) => {
  const doc = await ApplicationDocument.findById(req.params.id);
  if (!doc) throw ApiError.notFound('That document was not found');

  const isOwner = String(doc.owner) === String(req.user._id);
  if (!isOwner) throw ApiError.forbidden('You can only remove your own uploads');

  const application = await Application.findById(doc.application);
  if (!OWNABLE.includes(application.status)) {
    throw ApiError.badRequest('Documents can no longer be changed for this application');
  }

  removeFile(doc.fileName);
  await doc.deleteOne();

  await audit({ req, action: 'document.delete', resource: 'document', resourceId: doc._id });

  res.json({ success: true, message: 'Document removed' });
});

const downloadDocument = asyncHandler(async (req, res) => {
  const doc = await ApplicationDocument.findById(req.params.id);
  if (!doc) throw ApiError.notFound('That document was not found');

  const isOwner = String(doc.owner) === String(req.user._id);
  if (!isOwner && !userHasPermission(req.user, PERMISSIONS.DOCUMENT_READ_ANY)) {
    throw ApiError.forbidden('You do not have permission to open this document');
  }

  const filePath = path.join(uploadRoot, doc.fileName);
  if (!fs.existsSync(filePath)) throw ApiError.notFound('The file is no longer stored on the server');

  res.setHeader('Content-Type', doc.mimeType);
  res.setHeader('Content-Disposition', `inline; filename="${doc.originalName.replace(/"/g, '')}"`);
  fs.createReadStream(filePath).pipe(res);
});

const reviewDocument = asyncHandler(async (req, res) => {
  const doc = await ApplicationDocument.findById(req.params.id);
  if (!doc) throw ApiError.notFound('That document was not found');

  const { reviewStatus, remark } = req.body;
  if (!['approved', 'rejected'].includes(reviewStatus)) {
    throw ApiError.badRequest('Please choose approved or rejected');
  }
  if (reviewStatus === 'rejected' && !remark) {
    throw ApiError.badRequest('Please tell the applicant why this document was not accepted');
  }

  doc.reviewStatus = reviewStatus;
  doc.reviewRemark = remark ? String(remark).slice(0, 300) : '';
  doc.reviewedBy = req.user._id;
  doc.reviewedAt = new Date();
  await doc.save();

  await audit({
    req,
    action: `document.${reviewStatus}`,
    resource: 'document',
    resourceId: doc._id,
    meta: { type: doc.type }
  });

  res.json({ success: true, message: `Document marked as ${reviewStatus}`, data: { document: doc } });
});

const myDocuments = asyncHandler(async (req, res) => {
  const filter = userHasPermission(req.user, PERMISSIONS.DOCUMENT_READ_ANY)
    ? {}
    : { owner: req.user._id };

  const documents = await ApplicationDocument.find(filter)
    .sort('-createdAt')
    .limit(200)
    .populate('application', 'refNo status');

  res.json({ success: true, data: { documents } });
});

module.exports = {
  uploadDocument,
  listForApplication,
  removeDocument,
  downloadDocument,
  reviewDocument,
  myDocuments
};
