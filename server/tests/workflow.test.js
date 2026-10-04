const { startDb, stopDb, api, makeUser, makeOffice, validApplicationBody, ROLES } = require('./helpers');
const { STATUS, STATUS_LABELS } = require('../src/utils/status');

let applicant;
let verifier;
let officer;
let admin;

async function newApplication() {
  const res = await api().post('/api/applications').set(applicant.auth).expect(201);
  return res.body.data.application;
}

async function submitFreshApplication() {
  const app = await newApplication();
  await api().patch(`/api/applications/${app._id}`).set(applicant.auth).send(validApplicationBody(applicant.user)).expect(200);
  const submitted = await api().post(`/api/applications/${app._id}/submit`).set(applicant.auth).expect(200);
  expect(submitted.body.data.application.status).toBe(STATUS.SUBMITTED);
  return submitted.body.data.application;
}

beforeAll(async () => {
  await startDb();
  await makeOffice();
  applicant = await makeUser(ROLES.APPLICANT);
  verifier = await makeUser(ROLES.VERIFIER);
  officer = await makeUser(ROLES.OFFICER);
  admin = await makeUser(ROLES.ADMIN);
});

afterAll(async () => {
  await stopDb();
});

describe('Application journey', () => {
  test('an applicant starts a draft application', async () => {
    const res = await api().post('/api/applications').set(applicant.auth);
    expect(res.status).toBe(201);
    expect(res.body.data.application.status).toBe(STATUS.DRAFT);
    expect(res.body.data.application.refNo).toMatch(/^PAS-\d{4}-\d{6}$/);
  });

  test('a half filled application cannot be sent', async () => {
    const app = await newApplication();
    const res = await api().post(`/api/applications/${app._id}/submit`).set(applicant.auth);
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/Please complete/i);
  });

  test('a completed application can be sent', async () => {
    const app = await newApplication();
    await api().patch(`/api/applications/${app._id}`).set(applicant.auth).send(validApplicationBody(applicant.user)).expect(200);
    const res = await api().post(`/api/applications/${app._id}/submit`).set(applicant.auth);
    expect(res.status).toBe(200);
    expect(res.body.data.application.status).toBe(STATUS.SUBMITTED);
    expect(res.body.data.application.statusHistory.length).toBeGreaterThanOrEqual(2);
  });

  test('a draft may be saved with blanks, but an unknown office is refused', async () => {
    const app = await newApplication();

    const blank = await api()
      .patch(`/api/applications/${app._id}`)
      .set(applicant.auth)
      .send({ personal: { firstName: '', dob: '' }, contact: { pincode: '' }, declarations: { agreesToTerms: false } });
    expect(blank.status).toBe(200);

    const unknownOffice = await api()
      .patch(`/api/applications/${app._id}`)
      .set(applicant.auth)
      .send({ office: '64b000000000000000000000' });
    expect(unknownOffice.status).toBe(400);
    expect(unknownOffice.body.message).toMatch(/passport office/i);
  });

  test('the full journey: check, approve, issue', async () => {
    const id = (await submitFreshApplication())._id;

    const queued = await api().get('/api/applications/queue?queue=verification').set(verifier.auth);
    expect(queued.status).toBe(200);
    expect(queued.body.data.applications.some((a) => a._id === id)).toBe(true);

    await api().post(`/api/applications/${id}/move`).set(verifier.auth).send({ action: 'startVerification' }).expect(200);
    await api().post(`/api/applications/${id}/move`).set(verifier.auth).send({ action: 'approveDocuments' }).expect(200);

    const approvalQueue = await api().get('/api/applications/queue?queue=approval').set(officer.auth);
    expect(approvalQueue.body.data.applications.some((a) => a._id === id)).toBe(true);

    await api().post(`/api/applications/${id}/move`).set(officer.auth).send({ action: 'startApproval' }).expect(200);
    await api().post(`/api/applications/${id}/move`).set(officer.auth).send({ action: 'approve' }).expect(200);
    const issued = await api().post(`/api/applications/${id}/move`).set(officer.auth).send({ action: 'issue' }).expect(200);

    expect(issued.body.data.application.status).toBe(STATUS.ISSUED);
    expect(issued.body.data.application.approval.passportNumber).toMatch(/^P[A-Z0-9]{8}$/);
    expect(issued.body.data.application.issuedAt).toBeTruthy();

    const view = await api().get(`/api/applications/${id}`).set(applicant.auth);
    expect(view.status).toBe(200);
    expect(view.body.data.statusLabel).toBe(STATUS_LABELS[STATUS.ISSUED]);
    expect(view.body.data.milestones.every((m) => m.done)).toBe(true);
  });

  test('steps cannot be skipped or repeated', async () => {
    const id = (await submitFreshApplication())._id;

    // Officer cannot jump straight to issuing a fresh submission.
    const jump = await api().post(`/api/applications/${id}/move`).set(officer.auth).send({ action: 'issue' });
    expect(jump.status).toBe(400);

    // Verifier cannot approve a passport.
    await api().post(`/api/applications/${id}/move`).set(verifier.auth).send({ action: 'startVerification' }).expect(200);
    await api().post(`/api/applications/${id}/move`).set(verifier.auth).send({ action: 'approveDocuments' }).expect(200);

    const wrongRole = await api().post(`/api/applications/${id}/move`).set(verifier.auth).send({ action: 'startApproval' });
    expect(wrongRole.status).toBe(403);

    // Officer has no document checking permission at all.
    const repeat = await api().post(`/api/applications/${id}/move`).set(officer.auth).send({ action: 'startVerification' });
    expect(repeat.status).toBe(403);
  });

  test('rejecting needs a short reason', async () => {
    const id = (await submitFreshApplication())._id;
    await api().post(`/api/applications/${id}/move`).set(verifier.auth).send({ action: 'startVerification' }).expect(200);

    const noReason = await api().post(`/api/applications/${id}/move`).set(verifier.auth).send({ action: 'reject' });
    expect(noReason.status).toBe(400);

    const rejected = await api()
      .post(`/api/applications/${id}/move`)
      .set(verifier.auth)
      .send({ action: 'reject', remark: 'Photo does not match the applicant' });

    expect(rejected.status).toBe(200);
    expect(rejected.body.data.application.status).toBe(STATUS.REJECTED);
    expect(rejected.body.data.application.rejectionReason).toMatch(/Photo does not match/);
  });

  test('an application sent back for more information can be resumed', async () => {
    const id = (await submitFreshApplication())._id;
    await api().post(`/api/applications/${id}/move`).set(verifier.auth).send({ action: 'startVerification' }).expect(200);

    const held = await api()
      .post(`/api/applications/${id}/move`)
      .set(verifier.auth)
      .send({ action: 'sendBack', remark: 'Please upload a clearer address proof' });
    expect(held.body.data.application.status).toBe(STATUS.ON_HOLD);

    const resumed = await api().post(`/api/applications/${id}/move`).set(verifier.auth).send({ action: 'resumeVerification' });
    expect(resumed.body.data.application.status).toBe(STATUS.VERIFICATION);
  });

  test('applicants only ever see their own applications', async () => {
    const stranger = await makeUser(ROLES.APPLICANT);
    const id = (await submitFreshApplication())._id;

    const view = await api().get(`/api/applications/${id}`).set(stranger.auth);
    expect(view.status).toBe(403);

    const edit = await api().patch(`/api/applications/${id}`).set(stranger.auth).send({ serviceType: 'renewal' });
    expect(edit.status).toBe(403);

    const remove = await api().delete(`/api/applications/${id}`).set(stranger.auth);
    expect(remove.status).toBe(403);
  });

  test('applicants cannot drive the staff workflow', async () => {
    const id = (await submitFreshApplication())._id;
    const res = await api().post(`/api/applications/${id}/move`).set(applicant.auth).send({ action: 'issue' });
    expect(res.status).toBe(403);
  });

  test('a sent application can no longer be edited or deleted', async () => {
    const id = (await submitFreshApplication())._id;

    const edit = await api().patch(`/api/applications/${id}`).set(applicant.auth).send({ serviceType: 'renewal' });
    expect(edit.status).toBe(400);

    const remove = await api().delete(`/api/applications/${id}`).set(applicant.auth);
    expect(remove.status).toBe(400);
  });

  test('a draft can still be thrown away', async () => {
    const app = await newApplication();
    const res = await api().delete(`/api/applications/${app._id}`).set(applicant.auth);
    expect(res.status).toBe(200);

    const gone = await api().get(`/api/applications/${app._id}`).set(applicant.auth);
    expect(gone.status).toBe(404);
  });

  test('staff can see the whole work list, applicants only their own', async () => {
    await submitFreshApplication();

    const own = await api().get('/api/applications/mine').set(applicant.auth);
    expect(own.status).toBe(200);
    expect(own.body.data.applications.every((a) => String(a.applicant) === String(applicant.user._id))).toBe(true);

    const staff = await api().get('/api/applications/mine').set(admin.auth);
    expect(staff.body.data.applications.every((a) => String(a.applicant) === String(admin.user._id))).toBe(true);

    const queue = await api().get('/api/applications/queue?queue=verification').set(admin.auth);
    expect(queue.body.data.applications.length).toBeGreaterThan(0);
  });

  test('an application reference that does not exist returns a friendly 404', async () => {
    const res = await api().get('/api/applications/64b000000000000000000000').set(applicant.auth);
    expect(res.status).toBe(404);
  });
});
