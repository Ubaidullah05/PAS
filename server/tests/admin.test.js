const { startDb, stopDb, api, makeUser, makeOffice, validApplicationBody, ROLES } = require('./helpers');
const User = require('../src/models/User');

let admin;
let officer;

beforeAll(async () => {
  await startDb();
  await makeOffice();
  admin = await makeUser(ROLES.ADMIN);
  officer = await makeUser(ROLES.OFFICER);
});

afterAll(async () => {
  await stopDb();
});

describe('Administrator tools', () => {
  test('an administrator creates a staff account', async () => {
    const res = await api()
      .post('/api/admin/users')
      .set(admin.auth)
      .send({
        name: 'New Verifier',
        email: 'newverifier@example.com',
        password: 'Secret@123',
        role: ROLES.VERIFIER
      });

    expect(res.status).toBe(201);
    expect(res.body.data.user.role).toBe(ROLES.VERIFIER);

    const login = await api()
      .post('/api/auth/login')
      .send({ email: 'newverifier@example.com', password: 'Secret@123' });
    expect(login.status).toBe(200);
  });

  test('an unknown role is refused', async () => {
    const res = await api()
      .post('/api/admin/users')
      .set(admin.auth)
      .send({ name: 'Nobody', email: 'nobody@example.com', password: 'Secret@123', role: 'wizard' });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/valid role/i);
  });

  test('an administrator can move somebody to another role', async () => {
    const target = await makeUser(ROLES.APPLICANT);

    const res = await api()
      .patch(`/api/admin/users/${target.user._id}`)
      .set(admin.auth)
      .send({ role: ROLES.VERIFIER });

    expect(res.status).toBe(200);
    expect(res.body.data.user.role).toBe(ROLES.VERIFIER);
  });

  test('an administrator cannot change their own role', async () => {
    const res = await api()
      .patch(`/api/admin/users/${admin.user._id}`)
      .set(admin.auth)
      .send({ role: ROLES.APPLICANT });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/own role/i);
  });

  test('the last administrator cannot be suspended', async () => {
    const res = await api()
      .patch(`/api/admin/users/${admin.user._id}`)
      .set(admin.auth)
      .send({ status: 'suspended' });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/own account|administrator/i);
  });

  test('a suspended account is blocked from signing in', async () => {
    const target = await makeUser(ROLES.OFFICER);
    await api()
      .patch(`/api/admin/users/${target.user._id}`)
      .set(admin.auth)
      .send({ status: 'suspended' })
      .expect(200);

    const login = await api()
      .post('/api/auth/login')
      .send({ email: target.user.email, password: 'Secret@123' });

    expect(login.status).toBe(403);
  });

  test('the user list can be searched and filtered', async () => {
    const all = await api().get('/api/admin/users').set(admin.auth);
    expect(all.status).toBe(200);
    expect(all.body.data.users.length).toBeGreaterThan(1);

    const filtered = await api().get('/api/admin/users?role=verifier').set(admin.auth);
    expect(filtered.body.data.users.every((u) => u.role === ROLES.VERIFIER)).toBe(true);

    const searched = await api().get('/api/admin/users?search=New Verifier').set(admin.auth);
    expect(searched.body.data.users).toHaveLength(1);
  });

  test('the administrator can add and switch off passport offices', async () => {
    const created = await api()
      .post('/api/admin/offices')
      .set(admin.auth)
      .send({
        code: 'PSK-NEW',
        name: 'Passport Seva Kendra - Lucknow',
        city: 'Lucknow',
        state: 'Uttar Pradesh',
        address: '34, Hazratganj, Lucknow - 226001'
      });

    expect(created.status).toBe(201);

    const updated = await api()
      .patch(`/api/admin/offices/${created.body.data.office._id}`)
      .set(admin.auth)
      .send({ active: false });

    expect(updated.status).toBe(200);
    expect(updated.body.data.office.active).toBe(false);

    const offices = await api().get('/api/appointments/offices').set(admin.auth);
    expect(offices.body.data.offices.some((o) => o.code === 'PSK-NEW')).toBe(true);
  });

  test('the reports page shows totals', async () => {
    const res = await api().get('/api/admin/reports').set(admin.auth);
    expect(res.status).toBe(200);
    expect(res.body.data.totals.users).toBeGreaterThan(0);
    expect(Array.isArray(res.body.data.byStatus)).toBe(true);
  });

  test('important actions are written to the audit trail', async () => {
    const res = await api().get('/api/admin/audit?action=admin.user').set(admin.auth);
    expect(res.status).toBe(200);
    expect(res.body.data.logs.length).toBeGreaterThan(0);
    expect(res.body.data.logs[0].actor).toBeTruthy();
  });

  test('the list of roles and permissions can be reviewed', async () => {
    const res = await api().get('/api/admin/roles').set(admin.auth);
    expect(res.status).toBe(200);

    const roles = res.body.data.roles;
    expect(roles).toHaveLength(4);
    const applicant = roles.find((r) => r.role === ROLES.APPLICANT);
    expect(applicant.permissions).not.toContain('application:approve');
    expect(applicant.permissions).toContain('application:create');
  });
});

describe('Dashboard and notifications', () => {
  test('an applicant sees their own summary', async () => {
    const { auth } = await makeUser(ROLES.APPLICANT);
    const res = await api().get('/api/dashboard/overview').set(auth);

    expect(res.status).toBe(200);
    expect(res.body.data.isStaff).toBe(false);
    expect(res.body.data.cards).toHaveLength(4);
    expect(res.body.data.roleLabel).toBe('Applicant');
  });

  test('staff see the work waiting for them', async () => {
    const res = await api().get('/api/dashboard/overview').set(officer.auth);

    expect(res.status).toBe(200);
    expect(res.body.data.isStaff).toBe(true);
    expect(res.body.data.cards.some((c) => c.label === 'Waiting for documents check')).toBe(true);
  });

  test('notifications start empty and can be marked read', async () => {
    const { auth } = await makeUser(ROLES.APPLICANT);

    const list = await api().get('/api/dashboard/notifications').set(auth);
    expect(list.status).toBe(200);
    expect(list.body.data.notifications).toHaveLength(0);

    await api().patch('/api/dashboard/notifications/all').set(auth).expect(200);
  });

  test('sending an application notifies the applicant', async () => {
    const { auth, user } = await makeUser(ROLES.APPLICANT);

    const app = (await api().post('/api/applications').set(auth)).body.data.application;
    await api()
      .patch(`/api/applications/${app._id}`)
      .set(auth)
      .send(validApplicationBody(user))
      .expect(200);

    await api().post(`/api/applications/${app._id}/submit`).set(auth).expect(200);

    const verifier = await makeUser(ROLES.VERIFIER);
    await api().post(`/api/applications/${app._id}/move`).set(verifier.auth).send({ action: 'startVerification' }).expect(200);

    const list = await api().get('/api/dashboard/notifications').set(auth);
    expect(list.body.data.notifications.length).toBeGreaterThan(0);
    expect(list.body.data.unread).toBeGreaterThan(0);
  });

  test('the health check answers without a token', async () => {
    const res = await api().get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  test('an unknown route returns a clear message', async () => {
    const res = await api().get('/api/definitely-not-here');
    expect(res.status).toBe(404);
    expect(res.body.message).toMatch(/not found/i);
  });
});
