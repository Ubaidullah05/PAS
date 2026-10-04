const Office = require('../models/Office');
const Slot = require('../models/AppointmentSlot');
const Appointment = require('../models/Appointment');
const Application = require('../models/Application');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { audit } = require('../utils/audit');
const { notify } = require('../utils/notify');
const { userHasPermission, PERMISSIONS } = require('../config/rbac');
const { STATUS } = require('../utils/status');

const OPEN_STATES = [STATUS.DRAFT, STATUS.SUBMITTED, STATUS.VERIFICATION, STATUS.VERIFIED, STATUS.APPROVAL, STATUS.APPROVED, STATUS.ON_HOLD];

const today = () => new Date().toISOString().slice(0, 10);

const listOffices = asyncHandler(async (req, res) => {
  const filter = userHasPermission(req.user, PERMISSIONS.OFFICE_MANAGE) ? {} : { active: true };
  const offices = await Office.find(filter).sort('name');
  res.json({ success: true, data: { offices } });
});

const listSlots = asyncHandler(async (req, res) => {
  const { office, date } = req.query;
  if (!office || !date) throw ApiError.badRequest('Please choose a passport office and a date');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw ApiError.badRequest('Please choose a valid date');
  if (date < today()) throw ApiError.badRequest('That date is already in the past');

  const slots = await Slot.find({ office, date, closed: false }).sort('time').lean();

  res.json({
    success: true,
    data: {
      slots: slots.map((s) => ({ ...s, seatsLeft: Math.max(0, s.capacity - s.bookedCount) }))
    }
  });
});

const book = asyncHandler(async (req, res) => {
  const { applicationId, slotId, purpose } = req.body;

  const application = await Application.findById(applicationId);
  if (!application) throw ApiError.notFound('We could not find that application');
  if (String(application.applicant) !== String(req.user._id)) {
    throw ApiError.forbidden('You can only book a visit for your own application');
  }
  if (!OPEN_STATES.includes(application.status)) {
    throw ApiError.badRequest('This application does not need a visit right now');
  }

  const existing = await Appointment.findOne({
    applicant: req.user._id,
    application: application._id,
    status: 'booked'
  });
  if (existing) {
    throw ApiError.conflict(
      `You already have a visit booked (${existing.refNo}). Cancel it first if you want a new one.`
    );
  }

  const slot = await Slot.findById(slotId).populate('office', 'name city');
  if (!slot || slot.closed) throw ApiError.badRequest('That time slot is no longer available');
  if (slot.date < today()) throw ApiError.badRequest('That date is already in the past');
  if (slot.bookedCount >= slot.capacity) throw ApiError.badRequest('That time slot is fully booked');

  // Optimistic lock: only one request can claim the last seat.
  const claimed = await Slot.updateOne(
    { _id: slot._id, bookedCount: slot.bookedCount },
    { $inc: { bookedCount: 1 } }
  );
  if (claimed.modifiedCount !== 1) {
    throw ApiError.badRequest('That time slot was just taken. Please pick another one.');
  }

  try {
    const appointment = await Appointment.create({
      applicant: req.user._id,
      application: application._id,
      office: slot.office._id || slot.office,
      slot: slot._id,
      date: slot.date,
      time: slot.time,
      purpose: purpose || 'verification'
    });

    await audit({
      req,
      action: 'appointment.book',
      resource: 'appointment',
      resourceId: appointment._id,
      meta: { date: slot.date, time: slot.time }
    });

    await notify(req.user._id, {
      title: 'Visit booked',
      message: `Your visit is on ${slot.date} at ${slot.time} at ${slot.office.name}.`,
      type: 'success',
      link: '/appointments'
    });

    res.status(201).json({
      success: true,
      message: 'Your visit is confirmed',
      data: { appointment }
    });
  } catch (err) {
    await Slot.updateOne({ _id: slot._id }, { $inc: { bookedCount: -1 } });
    throw err;
  }
});

const mine = asyncHandler(async (req, res) => {
  const filter = userHasPermission(req.user, PERMISSIONS.APPOINTMENT_MANAGE)
    ? {}
    : { applicant: req.user._id };

  const appointments = await Appointment.find(filter)
    .sort('-createdAt')
    .limit(200)
    .populate('office', 'name city address')
    .populate('applicant', 'name email')
    .populate('application', 'refNo status');

  res.json({ success: true, data: { appointments } });
});

const cancel = asyncHandler(async (req, res) => {
  const appointment = await Appointment.findById(req.params.id);
  if (!appointment) throw ApiError.notFound('That visit was not found');

  const isOwner = String(appointment.applicant) === String(req.user._id);
  const canManage = userHasPermission(req.user, PERMISSIONS.APPOINTMENT_MANAGE);
  if (!isOwner && !canManage) throw ApiError.forbidden('You cannot change this visit');

  if (appointment.status !== 'booked') {
    throw ApiError.badRequest('This visit can no longer be changed');
  }

  appointment.status = 'cancelled';
  appointment.cancelledBy = req.user._id;
  appointment.cancelReason = (req.body.reason || '').toString().slice(0, 300);
  await appointment.save();

  await Slot.updateOne({ _id: appointment.slot }, { $inc: { bookedCount: -1 } });

  await audit({ req, action: 'appointment.cancel', resource: 'appointment', resourceId: appointment._id });

  res.json({ success: true, message: 'The visit was cancelled and the seat released' });
});

const markCompleted = asyncHandler(async (req, res) => {
  const appointment = await Appointment.findById(req.params.id);
  if (!appointment) throw ApiError.notFound('That visit was not found');
  if (appointment.status !== 'booked') throw ApiError.badRequest('This visit is not active');

  appointment.status = req.body.status === 'missed' ? 'missed' : 'completed';
  await appointment.save();

  await audit({ req, action: `appointment.${appointment.status}`, resource: 'appointment', resourceId: appointment._id });

  res.json({ success: true, message: 'Visit updated', data: { appointment } });
});

/* ---------------------------- slot admin ---------------------------- */

const createSlot = asyncHandler(async (req, res) => {
  const { office, date, time, capacity, dates } = req.body;

  if (!office || !date || !time) throw ApiError.badRequest('Please choose an office, a date and a time');

  const found = await Office.findById(office);
  if (!found) throw ApiError.notFound('That passport office was not found');

  const slot = await Slot.create({ office, date, time, capacity: capacity || 10 });

  await audit({ req, action: 'appointment.slot.create', resource: 'slot', resourceId: slot._id });

  res.status(201).json({ success: true, message: 'Time slot added', data: { slot } });
});

/** Bulk helper so admins can open a week of slots in one go. */
const createSlotRange = asyncHandler(async (req, res) => {
  const { office, fromDate, toDate, times, capacity } = req.body;

  if (!office || !fromDate || !toDate || !Array.isArray(times) || !times.length) {
    throw ApiError.badRequest('Please provide an office, a date range and at least one time');
  }
  if (toDate < fromDate) throw ApiError.badRequest('The end date must be after the start date');

  const days = [];
  const cursor = new Date(`${fromDate}T00:00:00Z`);
  const end = new Date(`${toDate}T00:00:00Z`);
  while (cursor <= end && days.length < 60) {
    days.push(cursor.toISOString().slice(0, 10));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  const docs = [];
  for (const date of days) {
    for (const time of times) docs.push({ office, date, time, capacity: capacity || 10 });
  }

  const result = await Slot.insertMany(docs, { ordered: false }).catch((err) => {
    if (err.code === 11000) return [];
    throw err;
  });

  res.status(201).json({
    success: true,
    message: `${result.length} time slots opened`,
    data: { created: result.length }
  });
});

const listAllSlots = asyncHandler(async (req, res) => {
  const filter = {};
  if (req.query.office) filter.office = req.query.office;
  if (req.query.date) filter.date = req.query.date;
  else filter.date = { $gte: today() };

  const slots = await Slot.find(filter)
    .sort('date time')
    .limit(300)
    .populate('office', 'name city');

  res.json({ success: true, data: { slots } });
});

const toggleSlot = asyncHandler(async (req, res) => {
  const slot = await Slot.findById(req.params.id);
  if (!slot) throw ApiError.notFound('That time slot was not found');
  slot.closed = !slot.closed;
  await slot.save();

  await audit({ req, action: 'appointment.slot.toggle', resource: 'slot', resourceId: slot._id });

  res.json({ success: true, message: slot.closed ? 'Time slot closed' : 'Time slot reopened', data: { slot } });
});

module.exports = {
  listOffices,
  listSlots,
  book,
  mine,
  cancel,
  markCompleted,
  createSlot,
  createSlotRange,
  listAllSlots,
  toggleSlot
};
