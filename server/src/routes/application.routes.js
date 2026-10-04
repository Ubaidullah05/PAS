const router = require('express').Router();
const { body, param } = require('express-validator');
const applicationController = require('../controllers/application.controller');
const documentController = require('../controllers/document.controller');
const { authenticate, authorize, allowRoles } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { PERMISSIONS, ROLES } = require('../config/rbac');
const { upload } = require('../utils/upload');

router.use(authenticate);

/* ------------------------------ applicant --------------------------- */

router.post(
  '/',
  authorize(PERMISSIONS.APPLICATION_CREATE),
  allowRoles(ROLES.APPLICANT),
  applicationController.create
);

router.get(
  '/mine',
  authorize(PERMISSIONS.APPLICATION_READ_OWN),
  applicationController.listMine
);

router.get('/stats', applicationController.stats);

/* ------------------------------- staff ------------------------------ */

router.get(
  '/all',
  authorize(PERMISSIONS.APPLICATION_READ_ANY),
  applicationController.listAll
);

router.get(
  '/queue',
  authorize(PERMISSIONS.APPLICATION_READ_ANY),
  allowRoles(ROLES.VERIFIER, ROLES.OFFICER, ROLES.ADMIN),
  applicationController.queue
);

/* --------------------------- single record -------------------------- */

router.get(
  '/:id',
  [param('id').isMongoId().withMessage('That application reference is not valid'), validate],
  applicationController.getOne
);

router.patch(
  '/:id',
  allowRoles(ROLES.APPLICANT),
  [
    param('id').isMongoId().withMessage('That application reference is not valid'),
    body('personal.dob').optional({ values: 'falsy' }).isISO8601().withMessage('Please enter a valid date of birth'),
    body('contact.pincode')
      .optional({ values: 'falsy' })
      .matches(/^[0-9]{6}$/)
      .withMessage('Pincode must be 6 digits'),
    validate
  ],
  applicationController.updateOwn
);

router.delete(
  '/:id',
  allowRoles(ROLES.APPLICANT),
  [param('id').isMongoId().withMessage('That application reference is not valid'), validate],
  applicationController.removeOwn
);

router.post(
  '/:id/submit',
  allowRoles(ROLES.APPLICANT),
  authorize(PERMISSIONS.APPLICATION_SUBMIT),
  [param('id').isMongoId().withMessage('That application reference is not valid'), validate],
  applicationController.submit
);

/**
 * Every staff decision (approve / reject / send back / issue ...)
 * goes through one endpoint and is re-checked inside the workflow
 * table - role, permission and current status must all line up.
 */
router.post(
  '/:id/move',
  allowRoles(ROLES.VERIFIER, ROLES.OFFICER, ROLES.ADMIN),
  [param('id').isMongoId().withMessage('That application reference is not valid'), validate],
  applicationController.move
);

/* ----------------------------- documents ---------------------------- */

router.post(
  '/:id/documents',
  allowRoles(ROLES.APPLICANT),
  [param('id').isMongoId().withMessage('That application reference is not valid'), validate],
  upload.single('file'),
  documentController.uploadDocument
);

router.get(
  '/:id/documents',
  [param('id').isMongoId().withMessage('That application reference is not valid'), validate],
  documentController.listForApplication
);

module.exports = router;
