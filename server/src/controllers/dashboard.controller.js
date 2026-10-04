const Application = require('../models/Application');
const Appointment = require('../models/Appointment');
const Notification = require('../models/Notification');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const { STATUS, STATUS_LABELS } = require('../utils/status');
const { userHasPermission, PERMISSIONS, ROLE_HOME, ROLE_LABELS } = require('../config/rbac');

const today = () => new Date().toISOString().slice(0, 10);

const overview = asyncHandler(async (req, res) => {
  const isStaff = userHasPermission(req.user, PERMISSIONS.DASHBOARD_VIEW_ALL);
  const appFilter = isStaff ? {} : { applicant: req.user._id };
  const apptFilter = isStaff ? { date: { $gte: today() }, status: 'booked' } : { applicant: req.user._id, status: 'booked' };

  const applications = await Application.find(appFilter)
    .sort('-createdAt')
    .limit(8)
    .populate('office', 'name city');

  const appointments = await Appointment.find(apptFilter)
    .sort('date time')
    .limit(5)
    .populate('office', 'name city address');

  const grouped = await Application.aggregate([{ $match: appFilter }, { $group: { _id: '$status', count: { $sum: 1 } } }]);
  const counts = {};
  Object.values(STATUS).forEach((s) => {
    counts[s] = 0;
  });
  grouped.forEach((g) => {
    counts[g._id] = g.count;
  });

  const unread = await Notification.countDocuments({ user: req.user._id, read: false });

  const totalApps = grouped.reduce((sum, g) => sum + g.count, 0);
  const inProgress =
    counts[STATUS.SUBMITTED] +
    counts[STATUS.VERIFICATION] +
    counts[STATUS.VERIFIED] +
    counts[STATUS.APPROVAL] +
    counts[STATUS.ON_HOLD];

  const cards = isStaff
    ? [
        { label: 'Waiting for documents check', value: counts[STATUS.SUBMITTED] + counts[STATUS.VERIFICATION], tone: 'info' },
        { label: 'Waiting for officer review', value: counts[STATUS.VERIFIED] + counts[STATUS.APPROVAL], tone: 'warning' },
        { label: 'Approved', value: counts[STATUS.APPROVED], tone: 'success' },
        { label: 'Passports issued', value: counts[STATUS.ISSUED], tone: 'success' }
      ]
    : [
        { label: 'Your applications', value: totalApps, tone: 'info' },
        { label: 'Drafts to finish', value: counts[STATUS.DRAFT], tone: 'neutral' },
        { label: 'Being processed', value: inProgress, tone: 'warning' },
        { label: 'Passports issued', value: counts[STATUS.ISSUED], tone: 'success' }
      ];

  res.json({
    success: true,
    data: {
      isStaff,
      role: req.user.role,
      roleLabel: ROLE_LABELS[req.user.role],
      home: ROLE_HOME[req.user.role],
      counts,
      cards,
      applications,
      appointments,
      statusLabels: STATUS_LABELS,
      unreadNotifications: unread
    }
  });
});

const notifications = asyncHandler(async (req, res) => {
  const items = await Notification.find({ user: req.user._id }).sort('-createdAt').limit(50);
  const unread = await Notification.countDocuments({ user: req.user._id, read: false });
  res.json({ success: true, data: { notifications: items, unread } });
});

const markRead = asyncHandler(async (req, res) => {
  if (req.params.id === 'all') {
    await Notification.updateMany({ user: req.user._id, read: false }, { read: true });
    return res.json({ success: true, message: 'All messages marked as read' });
  }

  const item = await Notification.findById(req.params.id);
  if (!item) throw ApiError.notFound('Message not found');
  if (String(item.user) !== String(req.user._id)) throw ApiError.forbidden('Not your message');

  item.read = true;
  await item.save();
  return res.json({ success: true, message: 'Message marked as read' });
});

module.exports = { overview, notifications, markRead };
