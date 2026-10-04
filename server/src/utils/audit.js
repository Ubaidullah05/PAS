const AuditLog = require('../models/AuditLog');

/** Small helper so every important action leaves a trace. */
async function audit({ req, action, resource, resourceId, meta }) {
  try {
    await AuditLog.create({
      actor: req?.user?._id || null,
      actorRole: req?.user?.role || 'system',
      action,
      resource,
      resourceId: resourceId ? String(resourceId) : undefined,
      meta: meta || {},
      ip: req?.ip
    });
  } catch (err) {
    console.error('[AUDIT] failed to write log', err.message);
  }
}

module.exports = { audit };
