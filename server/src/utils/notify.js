const Notification = require('../models/Notification');

async function notify(user, payload) {
  if (!user) return null;
  try {
    return await Notification.create({
      user,
      title: payload.title,
      message: payload.message,
      type: payload.type || 'info',
      link: payload.link
    });
  } catch (err) {
    console.error('[NOTIFY] failed', err.message);
    return null;
  }
}

module.exports = { notify };
