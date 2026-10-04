const { startDb, stopDb, api, makeUser, makeOffice, futureDate, ROLES } = require('./helpers');
const Appointment = require('../src/models/Appointment');
const Slot = require('../src/models/AppointmentSlot');

let applicant;
let otherApplicant;
let admin;
let office;
let applicationId;

beforeAll(async () => {
  await startDb();
  applicant = await makeUser(ROLES.APPLICANT);
  otherApplicant = await makeUser(ROLES.APPLICANT);
  admin = await makeUser(ROLES.ADMIN);
  office = await makeOffice();

  // Open a few days of time slots, the way the office would.
  const days = [1, 2, 3, 4, 5, 6, 7, 11, 12];
  const times = ['10:00', '11:00', '12:00'];
  const slots = [];
  for (const day of days) {
    for (const time of times) slots.push({ office: office._id, date: futureDate(day), time, capacity: 5 });
  }
  await Slot.insertMany(slots);

  const created = await api().post('/api/applications').set(applicant.auth).expect(201);
  applicationId = created.body.data.application._id;
});

afterAll(async () => {
  await stopDb();
});

describe('Appointment booking', () => {
  test('offices are listed for everyone who signed in', async () => {
    const res = await api().get('/api/appointments/offices').set(applicant.auth);
    expect(res.status).toBe(200);
    expect(res.body.data.offices.length).toBeGreaterThan(0);
  });

  test('free time slots are shown for a chosen office and date', async () => {
    const date = futureDate(2);
    const res = await api()
      .get(`/api/appointments/slots?office=${office._id}&date=${date}`)
      .set(applicant.auth);

    expect(res.status).toBe(200);
    expect(res.body.data.slots.length).toBeGreaterThan(0);
    expect(res.body.data.slots[0]).toHaveProperty('seatsLeft');
  });

  test('a visitor cannot create time slots', async () => {
    const res = await api()
      .post('/api/appointments/slots')
      .set(applicant.auth)
      .send({ office: office._id, date: futureDate(5), time: '10:00' });

    expect(res.status).toBe(403);
  });

  test('the administrator opens time slots', async () => {
    const res = await api()
      .post('/api/appointments/slots')
      .set(admin.auth)
      .send({ office: office._id, date: futureDate(9), time: '10:00', capacity: 2 });

    expect(res.status).toBe(201);
    expect(res.body.data.slot.capacity).toBe(2);
  });

  test('an applicant books a slot for their own application', async () => {
    const date = futureDate(3);
    const slots = await api()
      .get(`/api/appointments/slots?office=${office._id}&date=${date}`)
      .set(applicant.auth);

    const slot = slots.body.data.slots.find((s) => s.seatsLeft > 0);
    expect(slot).toBeDefined();

    const res = await api()
      .post('/api/appointments/book')
      .set(applicant.auth)
      .send({ applicationId, slotId: slot._id, purpose: 'verification' });

    expect(res.status).toBe(201);
    expect(res.body.data.appointment.status).toBe('booked');
    expect(res.body.data.appointment.refNo).toMatch(/^APT-\d{4}-\d{6}$/);
  });

  test('the seat count goes down after a booking', async () => {
    const date = futureDate(3);
    const slots = await api()
      .get(`/api/appointments/slots?office=${office._id}&date=${date}`)
      .set(applicant.auth);

    const booked = slots.body.data.slots.find((s) => s.time === '10:00');
    expect(booked.bookedCount).toBeGreaterThan(0);
  });

  test('the same application cannot book twice', async () => {
    const date = futureDate(4);
    const slots = await api()
      .get(`/api/appointments/slots?office=${office._id}&date=${date}`)
      .set(applicant.auth);

    const slot = slots.body.data.slots[0];
    const res = await api()
      .post('/api/appointments/book')
      .set(applicant.auth)
      .send({ applicationId, slotId: slot._id });

    expect(res.status).toBe(409);
    expect(res.body.message).toMatch(/already have a visit booked/i);
  });

  test('somebody else cannot book a visit for your application', async () => {
    const date = futureDate(6);
    const slots = await api()
      .get(`/api/appointments/slots?office=${office._id}&date=${date}`)
      .set(otherApplicant.auth);

    const slot = slots.body.data.slots[0];
    const res = await api()
      .post('/api/appointments/book')
      .set(otherApplicant.auth)
      .send({ applicationId, slotId: slot._id });

    expect(res.status).toBe(403);
  });

  test('a full time slot cannot be taken', async () => {
    const date = futureDate(9);
    const slots = await api()
      .get(`/api/appointments/slots?office=${office._id}&date=${date}`)
      .set(admin.auth);

    const full = slots.body.data.slots.find((s) => s.capacity === 2);
    expect(full).toBeDefined();

    // Fill the slot with two other people.
    const personA = await makeUser(ROLES.APPLICANT);
    const personB = await makeUser(ROLES.APPLICANT);
    const appA = (await api().post('/api/applications').set(personA.auth)).body.data.application;
    const appB = (await api().post('/api/applications').set(personB.auth)).body.data.application;

    await api().post('/api/appointments/book').set(personA.auth).send({ applicationId: appA._id, slotId: full._id }).expect(201);
    await api().post('/api/appointments/book').set(personB.auth).send({ applicationId: appB._id, slotId: full._id }).expect(201);

    const personC = await makeUser(ROLES.APPLICANT);
    const appC = (await api().post('/api/applications').set(personC.auth)).body.data.application;
    const res = await api()
      .post('/api/appointments/book')
      .set(personC.auth)
      .send({ applicationId: appC._id, slotId: full._id });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/fully booked/i);
  });

  test('cancelling gives the seat back', async () => {
    const mine = await api().get('/api/appointments/mine').set(applicant.auth);
    const appointment = mine.body.data.appointments.find((a) => a.status === 'booked');
    expect(appointment).toBeDefined();

    const before = (await api().get(`/api/appointments/slots?office=${office._id}&date=${appointment.date}`).set(applicant.auth))
      .body.data.slots.find((s) => s._id === appointment.slot._id || s.time === appointment.time);

    const cancel = await api()
      .post(`/api/appointments/${appointment._id}/cancel`)
      .set(applicant.auth)
      .send({ reason: 'Something came up' });

    expect(cancel.status).toBe(200);

    const after = (await api().get(`/api/appointments/slots?office=${office._id}&date=${appointment.date}`).set(applicant.auth))
      .body.data.slots.find((s) => s.time === appointment.time);

    expect(after.bookedCount).toBe(before.bookedCount - 1);
    expect(after.bookedCount).toBeGreaterThanOrEqual(0);
  });

  test('a cancelled visit cannot be cancelled again', async () => {
    const mine = await api().get('/api/appointments/mine').set(applicant.auth);
    const cancelled = mine.body.data.appointments.find((a) => a.status === 'cancelled');
    expect(cancelled).toBeDefined();

    const res = await api().post(`/api/appointments/${cancelled._id}/cancel`).set(applicant.auth);
    expect(res.status).toBe(400);
  });

  test('only staff can change a visit to completed', async () => {
    const date = futureDate(11);
    const slots = await api().get(`/api/appointments/slots?office=${office._id}&date=${date}`).set(admin.auth);
    const slot = slots.body.data.slots[0];

    const person = await makeUser(ROLES.APPLICANT);
    const app = (await api().post('/api/applications').set(person.auth)).body.data.application;
    const booked = await api()
      .post('/api/appointments/book')
      .set(person.auth)
      .send({ applicationId: app._id, slotId: slot._id })
      .expect(201);

    const byApplicant = await api()
      .patch(`/api/appointments/${booked.body.data.appointment._id}/status`)
      .set(person.auth)
      .send({ status: 'completed' });
    expect(byApplicant.status).toBe(403);

    const byAdmin = await api()
      .patch(`/api/appointments/${booked.body.data.appointment._id}/status`)
      .set(admin.auth)
      .send({ status: 'completed' });
    expect(byAdmin.status).toBe(200);
    expect(byAdmin.body.data.appointment.status).toBe('completed');
  });

  test('an applicant can see only their own visits', async () => {
    const mine = await api().get('/api/appointments/mine').set(applicant.auth);
    expect(mine.status).toBe(200);
    expect(
      mine.body.data.appointments.every((a) => String(a.applicant?._id || a.applicant) === String(applicant.user._id))
    ).toBe(true);
  });

  test('past dates are refused', async () => {
    const res = await api()
      .get(`/api/appointments/slots?office=${office._id}&date=2020-01-01`)
      .set(applicant.auth);

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/past/i);
  });

  test('the administrator sees every visit', async () => {
    const all = await api().get('/api/appointments/mine').set(admin.auth);
    expect(all.status).toBe(200);
    const count = await Appointment.countDocuments({});
    expect(all.body.data.appointments.length).toBe(count);
  });
});
