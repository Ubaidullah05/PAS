const router = require('express').Router();
const { body, param } = require('express-validator');
const documentController = require('../controllers/document.controller');
const { authenticate, authorize, allowRoles } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { PERMISSIONS, ROLES } = require('../config/rbac');

router.use(authenticate);

router.get('/', documentController.myDocuments);

router.get(
  '/:id/file',
  [param('id').isMongoId().withMessage('That document reference is not valid'), validate],
  documentController.downloadDocument
);

router.delete(
  '/:id',
  allowRoles(ROLES.APPLICANT),
  [param('id').isMongoId().withMessage('That document reference is not valid'), validate],
  documentController.removeDocument
);

router.patch(
  '/:id/review',
  authorize(PERMISSIONS.DOCUMENT_REVIEW),
  allowRoles(ROLES.VERIFIER, ROLES.OFFICER, ROLES.ADMIN),
  [
    param('id').isMongoId().withMessage('That document reference is not valid'),
    body('reviewStatus').isIn(['approved', 'rejected']).withMessage('Please choose approved or rejected'),
    validate
  ],
  documentController.reviewDocument
);

module.exports = router;
