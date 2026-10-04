const router = require('express').Router();
const rateLimit = require('express-rate-limit');
const { body } = require('express-validator');
const authController = require('../controllers/auth.controller');
const { authenticate } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { passwordRule, emailRule, nameRule, phoneRule } = require('../middleware/rules');

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: process.env.NODE_ENV === 'test' ? 100000 : 30,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { success: false, message: 'Too many attempts. Please wait a few minutes and try again.' }
});

router.post(
  '/register',
  authLimiter,
  [nameRule(), emailRule(), passwordRule(), phoneRule(), validate],
  authController.register
);

router.post(
  '/login',
  authLimiter,
  [emailRule(), body('password').notEmpty().withMessage('Please enter your password'), validate],
  authController.login
);

router.get('/me', authenticate, authController.me);

router.put(
  '/profile',
  authenticate,
  [
    body('name').optional().trim().isLength({ min: 2, max: 80 }).withMessage('Please enter your full name'),
    emailRule(),
    phoneRule(),
    validate
  ],
  authController.updateProfile
);

router.put(
  '/password',
  authenticate,
  [body('currentPassword').notEmpty().withMessage('Please enter your current password'), passwordRule('newPassword'), validate],
  authController.changePassword
);

module.exports = router;
