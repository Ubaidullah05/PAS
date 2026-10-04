const { startDb, stopDb, api, makeUser, ROLES } = require('./helpers');
const {
  ROLE_PERMISSIONS,
  ALL_PERMISSIONS,
  ALL_ROLES,
  permissionsForRole,
  userHasPermission,
  PERMISSIONS
} = require('../src/config/rbac');

beforeAll(async () => {
  await startDb();
});

afterAll(async () => {
  await stopDb();
});

describe('RBAC permission matrix', () => {
  test('every role only holds permissions that exist', () => {
    for (const role of ALL_ROLES) {
      expect(ROLE_PERMISSIONS[role]).toBeDefined();
      for (const permission of ROLE_PERMISSIONS[role]) {
        expect(ALL_PERMISSIONS).toContain(permission);
      }
    }
  });

  test('an applicant can never touch staff actions', () => {
    const staffOnly = [
      PERMISSIONS.APPLICATION_VERIFY,
      PERMISSIONS.APPLICATION_APPROVE,
      PERMISSIONS.APPLICATION_ISSUE,
      PERMISSIONS.USER_MANAGE,
      PERMISSIONS.ROLE_ASSIGN,
      PERMISSIONS.OFFICE_MANAGE,
      PERMISSIONS.REPORT_VIEW,
      PERMISSIONS.AUDIT_VIEW
    ];
    for (const permission of staffOnly) {
      expect(userHasPermission({ role: ROLES.APPLICANT }, permission)).toBe(false);
    }
  });

  test('an officer cannot verify documents and a verifier cannot approve passports', () => {
    expect(userHasPermission({ role: ROLES.OFFICER }, PERMISSIONS.APPLICATION_VERIFY)).toBe(false);
    expect(userHasPermission({ role: ROLES.VERIFIER }, PERMISSIONS.APPLICATION_APPROVE)).toBe(false);
    expect(userHasPermission({ role: ROLES.VERIFIER }, PERMISSIONS.APPLICATION_ISSUE)).toBe(false);
  });

  test('only the administrator manages people, roles and offices', () => {
    for (const role of [ROLES.APPLICANT, ROLES.VERIFIER, ROLES.OFFICER]) {
      expect(userHasPermission({ role }, PERMISSIONS.USER_MANAGE)).toBe(false);
      expect(userHasPermission({ role }, PERMISSIONS.ROLE_ASSIGN)).toBe(false);
      expect(userHasPermission({ role }, PERMISSIONS.OFFICE_MANAGE)).toBe(false);
    }
    expect(userHasPermission({ role: ROLES.ADMIN }, PERMISSIONS.USER_MANAGE)).toBe(true);
  });

  test('unknown roles are treated as having no access at all', () => {
    expect(userHasPermission({ role: 'superuser' }, PERMISSIONS.DASHBOARD_VIEW_OWN)).toBe(false);
    expect(permissionsForRole('superuser')).toEqual([]);
  });

  test('a visitor can never act on a resource', () => {
    expect(userHasPermission(null, PERMISSIONS.APPLICATION_READ_OWN)).toBe(false);
    expect(userHasPermission(undefined, PERMISSIONS.PROFILE_UPDATE)).toBe(false);
  });
});

describe('RBAC on the API', () => {
  test('an applicant cannot open the admin user list', async () => {
    const { auth } = await makeUser(ROLES.APPLICANT);
    const res = await api().get('/api/admin/users').set(auth);
    expect(res.status).toBe(403);
  });

  test('an applicant cannot open the staff work queue', async () => {
    const { auth } = await makeUser(ROLES.APPLICANT);
    const res = await api().get('/api/applications/queue?queue=verification').set(auth);
    expect(res.status).toBe(403);
  });

  test('an applicant cannot read the audit trail', async () => {
    const { auth } = await makeUser(ROLES.APPLICANT);
    const res = await api().get('/api/admin/audit').set(auth);
    expect(res.status).toBe(403);
  });

  test('an applicant cannot create a staff account', async () => {
    const { auth } = await makeUser(ROLES.APPLICANT);
    const res = await api()
      .post('/api/admin/users')
      .set(auth)
      .send({ name: 'Fake Officer', email: 'fake@example.com', password: 'Secret@123', role: ROLES.OFFICER });
    expect(res.status).toBe(403);
  });

  test('an officer cannot create time slots (verifier cannot either)', async () => {
    const officer = await makeUser(ROLES.OFFICER);
    const verifier = await makeUser(ROLES.VERIFIER);
    const office = await require('../src/models/Office').create({
      code: 'PSK-R1',
      name: 'Test Office',
      city: 'Pune',
      state: 'Maharashtra',
      address: '1 Road'
    });

    const officerRes = await api()
      .post('/api/appointments/slots')
      .set(officer.auth)
      .send({ office: office._id, date: '2027-01-10', time: '10:00' });

    const verifierRes = await api()
      .post('/api/appointments/slots')
      .set(verifier.auth)
      .send({ office: office._id, date: '2027-01-10', time: '11:00' });

    expect(officerRes.status).toBe(403);
    expect(verifierRes.status).toBe(403);
  });

  test('an administrator can do all of the above', async () => {
    const { auth } = await makeUser(ROLES.ADMIN);

    const users = await api().get('/api/admin/users').set(auth);
    const roles = await api().get('/api/admin/roles').set(auth);
    const audit = await api().get('/api/admin/audit').set(auth);

    expect(users.status).toBe(200);
    expect(roles.status).toBe(200);
    expect(audit.status).toBe(200);
  });

  test('a verifier is stopped from approving a passport application', async () => {
    const verifier = await makeUser(ROLES.VERIFIER);
    const applicant = await makeUser(ROLES.APPLICANT);

    const created = await api().post('/api/applications').set(applicant.auth).expect(201);
    const id = created.body.data.application._id;

    const res = await api()
      .post(`/api/applications/${id}/move`)
      .set(verifier.auth)
      .send({ action: 'approve' });

    expect(res.status).toBe(403);
  });

  test('an officer is stopped from checking documents', async () => {
    const officer = await makeUser(ROLES.OFFICER);
    const applicant = await makeUser(ROLES.APPLICANT);

    const created = await api().post('/api/applications').set(applicant.auth).expect(201);
    const id = created.body.data.application._id;

    const res = await api()
      .post(`/api/applications/${id}/move`)
      .set(officer.auth)
      .send({ action: 'startVerification' });

    expect(res.status).toBe(403);
  });

  test('shared actions are still tied to their own stage', async () => {
    const { makeOffice, validApplicationBody } = require('./helpers');
    await makeOffice();
    const verifier = await makeUser(ROLES.VERIFIER);
    const officer = await makeUser(ROLES.OFFICER);
    const applicant = await makeUser(ROLES.APPLICANT);

    const created = await api().post('/api/applications').set(applicant.auth).expect(201);
    const id = created.body.data.application._id;
    await api()
      .patch(`/api/applications/${id}`)
      .set(applicant.auth)
      .send(validApplicationBody(applicant.user))
      .expect(200);
    await api().post(`/api/applications/${id}/submit`).set(applicant.auth).expect(200);

    // Verification stage belongs to the verifier.
    await api().post(`/api/applications/${id}/move`).set(verifier.auth).send({ action: 'startVerification' }).expect(200);
    const officerSendBack = await api()
      .post(`/api/applications/${id}/move`)
      .set(officer.auth)
      .send({ action: 'sendBack', remark: 'Not my stage' });
    expect(officerSendBack.status).toBe(403);
    const officerReject = await api()
      .post(`/api/applications/${id}/move`)
      .set(officer.auth)
      .send({ action: 'reject', remark: 'Not my stage' });
    expect(officerReject.status).toBe(403);

    // Approval stage belongs to the officer.
    await api().post(`/api/applications/${id}/move`).set(verifier.auth).send({ action: 'approveDocuments' }).expect(200);
    await api().post(`/api/applications/${id}/move`).set(officer.auth).send({ action: 'startApproval' }).expect(200);
    const verifierReject = await api()
      .post(`/api/applications/${id}/move`)
      .set(verifier.auth)
      .send({ action: 'reject', remark: 'Not my stage' });
    expect(verifierReject.status).toBe(403);
    const verifierSendBack = await api()
      .post(`/api/applications/${id}/move`)
      .set(verifier.auth)
      .send({ action: 'sendBack', remark: 'Not my stage' });
    expect(verifierSendBack.status).toBe(403);

    // The right person can still finish the job.
    await api().post(`/api/applications/${id}/move`).set(officer.auth).send({ action: 'approve' }).expect(200);
    await api().post(`/api/applications/${id}/move`).set(officer.auth).send({ action: 'issue' }).expect(200);
  });

  test('an unauthenticated visitor is asked to sign in', async () => {
    const res = await api().get('/api/applications/mine');
    expect(res.status).toBe(401);
  });

  test('a valid token for an unknown role gets no access', async () => {
    const { user } = await makeUser(ROLES.APPLICANT);
    user.role = 'president';
    await user.save({ validateBeforeSave: false });

    const jwt = require('../src/utils/jwt');
    const res = await api()
      .get('/api/admin/users')
      .set({ Authorization: `Bearer ${jwt.signToken(user)}` });

    expect(res.status).toBe(403);
    expect(res.body.message).toMatch(/unrecognised role|permission/i);
  });
});
