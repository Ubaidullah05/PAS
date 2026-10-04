const { body } = require('express-validator');

/** Shared "please pick a strong password" rule. */
const passwordRule = (field = 'password') =>
  body(field)
    .isLength({ min: 8, max: 72 })
    .withMessage('Your password must be at least 8 characters long')
    .matches(/[A-Za-z]/)
    .withMessage('Your password must contain a letter')
    .matches(/[0-9]/)
    .withMessage('Your password must contain a number');

const emailRule = (field = 'email') =>
  body(field).isEmail().withMessage('Please enter a valid email address').normalizeEmail();

const nameRule = (field = 'name') =>
  body(field).trim().isLength({ min: 2, max: 80 }).withMessage('Please enter your full name');

const phoneRule = (field = 'phone') =>
  body(field)
    .optional({ values: 'falsy' })
    .matches(/^[0-9+\-\s()]{7,20}$/)
    .withMessage('Please enter a valid phone number');

module.exports = { passwordRule, emailRule, nameRule, phoneRule };
