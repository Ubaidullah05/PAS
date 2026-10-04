const router = require('express').Router();
const { body, query, param } = require('express-validator');
const controller = require('../controllers/appointment.controller');
const { authenticate, authorize, allowRoles } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { PERMISSIONS, ROLES } = require('../config/rbac');
const { APPLICATION_PURPOSES } = require('../config/constants');

router.use(authenticate);

router.get('/offices', controller.listOffices);

router.get(
  '/slots',
  [query('office').isMongoId().withMessage('Please choose a passport office'), validate],
  controller.listSlots
);

router.get('/mine', controller.mine);

router.post(
  '/book',
  allowRoles(ROLES.APPLICANT),
  authorize(PERMISSIONS.APPOINTMENT_BOOK),
  [
    body('applicationId').isMongoId().withMessage('That application reference is not valid'),
    body('slotId').isMongoId().withMessage('Please choose a time slot'),
    body('purpose').optional().isIn(APPLICATION_PURPOSES),
    validate
  ],
  controller.book
);

router.post(
  '/:id/cancel',
  [param('id').isMongoId().withMessage('That visit reference is not valid'), validate],
  controller.cancel
);

router.patch(
  '/:id/status',
  authorize(PERMISSIONS.APPOINTMENT_MANAGE),
  [
    param('id').isMongoId().withMessage('That visit reference is not valid'),
    body('status').isIn(['completed', 'missed']).withMessage('Please choose completed or missed'),
    validate
  ],
  controller.markCompleted
);

/* ------------------------- slot management -------------------------- */

router.get(
  '/slots/all',
  authorize(PERMISSIONS.APPOINTMENT_SLOT_MANAGE),
  controller.listAllSlots
);

router.post(
  '/slots',
  authorize(PERMISSIONS.APPOINTMENT_SLOT_MANAGE),
  [
    body('office').isMongoId().withMessage('Please choose a passport office'),
    body('date').matches(/^\d{4}-\d{2}-\d{2}$/).withMessage('Please choose a valid date'),
    body('time').matches(/^\d{2}:\d{2}$/).withMessage('Please choose a valid time'),
    body('capacity').optional().isInt({ min: 1, max: 200 }).withMessage('Capacity must be between 1 and 200'),
    validate
  ],
  controller.createSlot
);

router.post(
  '/slots/range',
  authorize(PERMISSIONS.APPOINTMENT_SLOT_MANAGE),
  [
    body('office').isMongoId().withMessage('Please choose a passport office'),
    body('fromDate').matches(/^\d{4}-\d{2}-\d{2}$/).withMessage('Please choose a start date'),
    body('toDate').matches(/^\d{4}-\d{2}-\d{2}$/).withMessage('Please choose an end date'),
    body('times').isArray({ min: 1 }).withMessage('Please choose at least one time'),
    validate
  ],
  controller.createSlotRange
);

router.patch(
  '/slots/:id/toggle',
  authorize(PERMISSIONS.APPOINTMENT_SLOT_MANAGE),
  [param('id').isMongoId().withMessage('That time slot is not valid'), validate],
  controller.toggleSlot
);

module.exports = router;
