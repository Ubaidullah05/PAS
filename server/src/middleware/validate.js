const { validationResult } = require('express-validator');
const ApiError = require('../utils/ApiError');

/**
 * Runs after express-validator chains and stops the request when the
 * information the user typed in is not valid.
 */
function validate(req, res, next) {
  const result = validationResult(req);
  if (result.isEmpty()) return next();

  const errors = result.array().map((e) => e.msg);
  next(ApiError.badRequest(errors[0] || 'Please check the information you entered', errors));
}

module.exports = validate;
