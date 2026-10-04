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

async function notifyMany(users, payload) {
  if (!users || !users.length) return;
  const docs = users.filter(Boolean).map((user) => ({
    user,
    title: payload.title,
    message: payload.message,
    type: payload.type || 'info',
    link: payload.link
  }));
  if (docs.length) await Notification.insertMany(docs);
}

module.exports = { notify, notifyMany };
