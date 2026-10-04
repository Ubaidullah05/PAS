const router = require('express').Router();
const { body, param, query } = require('express-validator');
const controller = require('../controllers/admin.controller');
const { authenticate, authorize } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { PERMISSIONS, ALL_ROLES } = require('../config/rbac');

router.use(authenticate);

/* ------------------------------- users ------------------------------ */

router.get(
  '/users',
  authorize(PERMISSIONS.USER_READ),
  [query('role').optional().isIn(ALL_ROLES).withMessage('Unknown role filter'), validate],
  controller.listUsers
);

router.post(
  '/users',
  authorize(PERMISSIONS.USER_MANAGE),
  [
    body('name').trim().isLength({ min: 2, max: 80 }).withMessage('Please enter the full name'),
    body('email').isEmail().withMessage('Please enter a valid email address').normalizeEmail(),
    body('password')
      .isLength({ min: 8, max: 72 })
      .withMessage('The password must be at least 8 characters long')
      .matches(/[0-9]/)
      .withMessage('The password must contain a number'),
    body('role').isIn(ALL_ROLES).withMessage('Please choose a valid role'),
    validate
  ],
  controller.createUser
);

router.patch(
  '/users/:id',
  authorize(PERMISSIONS.USER_MANAGE),
  [param('id').isMongoId().withMessage('That account reference is not valid'), validate],
  controller.updateUser
);

router.get('/roles', authorize(PERMISSIONS.USER_READ), controller.listRoles);

/* ------------------------------ offices ----------------------------- */

router.post(
  '/offices',
  authorize(PERMISSIONS.OFFICE_MANAGE),
  [
    body('code').trim().notEmpty().withMessage('Please give the office a short code'),
    body('name').trim().notEmpty().withMessage('Please enter the office name'),
    body('city').trim().notEmpty().withMessage('Please enter the city'),
    body('state').trim().notEmpty().withMessage('Please enter the state'),
    body('address').trim().notEmpty().withMessage('Please enter the address'),
    validate
  ],
  controller.createOffice
);

router.patch(
  '/offices/:id',
  authorize(PERMISSIONS.OFFICE_MANAGE),
  [param('id').isMongoId().withMessage('That office reference is not valid'), validate],
  controller.updateOffice
);

router.delete(
  '/offices/:id',
  authorize(PERMISSIONS.OFFICE_MANAGE),
  [param('id').isMongoId().withMessage('That office reference is not valid'), validate],
  controller.deleteOffice
);

/* ------------------------- reports and logs ------------------------- */

router.get('/reports', authorize(PERMISSIONS.REPORT_VIEW), controller.reports);

router.get('/audit', authorize(PERMISSIONS.AUDIT_VIEW), controller.auditLogs);

module.exports = router;
