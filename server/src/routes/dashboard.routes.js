const router = require('express').Router();
const { param } = require('express-validator');
const controller = require('../controllers/dashboard.controller');
const { authenticate } = require('../middleware/auth');
const validate = require('../middleware/validate');

router.use(authenticate);

router.get('/overview', controller.overview);
router.get('/notifications', controller.notifications);

router.patch(
  '/notifications/:id',
  [
    param('id')
      .custom((value) => value === 'all' || /^[0-9a-fA-F]{24}$/.test(value))
      .withMessage('Unknown message'),
    validate
  ],
  controller.markRead
);

module.exports = router;
