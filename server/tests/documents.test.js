const { startDb, stopDb, api, makeUser, ROLES } = require('./helpers');

let owner;
let stranger;
let verifier;

async function draftFor(user) {
  const res = await api().post('/api/applications').set(user.auth).expect(201);
  return res.body.data.application;
}

function attachFile(req, { filename = 'passport-photo.png', contentType = 'image/png' } = {}) {
  return req.attach('file', Buffer.from('fake-image-bytes'), { filename, contentType });
}

beforeAll(async () => {
  await startDb();
  owner = await makeUser(ROLES.APPLICANT);
  stranger = await makeUser(ROLES.APPLICANT);
  verifier = await makeUser(ROLES.VERIFIER);
});

afterAll(async () => {
  await stopDb();
});

describe('Documents', () => {
  test('an applicant uploads a document to their own application', async () => {
    const app = await draftFor(owner);

    const res = await attachFile(
      api().post(`/api/applications/${app._id}/documents`).set(owner.auth).field('type', 'photo')
    );

    expect(res.status).toBe(201);
    expect(res.body.data.document.type).toBe('photo');
    expect(res.body.data.document.reviewStatus).toBe('pending');
    expect(res.body.data.document.originalName).toBe('passport-photo.png');
  });

  test('the wrong file type is refused', async () => {
    const app = await draftFor(owner);

    const res = await attachFile(
      api().post(`/api/applications/${app._id}/documents`).set(owner.auth).field('type', 'photo'),
      { filename: 'evil.exe', contentType: 'application/x-msdownload' }
    );

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/JPG, PNG/i);
  });

  test('a document kind must be chosen', async () => {
    const app = await draftFor(owner);

    const res = await attachFile(api().post(`/api/applications/${app._id}/documents`).set(owner.auth));

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/kind of document/i);
  });

  test('a stranger cannot add files to somebody else application', async () => {
    const app = await draftFor(owner);

    const res = await attachFile(
      api().post(`/api/applications/${app._id}/documents`).set(stranger.auth).field('type', 'photo')
    );

    expect(res.status).toBe(403);
  });

  test('the owner can see and remove their uploads', async () => {
    const app = await draftFor(owner);
    const upload = await attachFile(
      api().post(`/api/applications/${app._id}/documents`).set(owner.auth).field('type', 'address_proof')
    );
    const docId = upload.body.data.document._id;

    const list = await api().get(`/api/applications/${app._id}/documents`).set(owner.auth);
    expect(list.status).toBe(200);
    expect(list.body.data.documents).toHaveLength(1);

    const open = await api().get(`/api/documents/${docId}/file`).set(owner.auth);
    expect(open.status).toBe(200);

    const remove = await api().delete(`/api/documents/${docId}`).set(owner.auth);
    expect(remove.status).toBe(200);

    const after = await api().get(`/api/applications/${app._id}/documents`).set(owner.auth);
    expect(after.body.data.documents).toHaveLength(0);
  });

  test('another applicant cannot open the file', async () => {
    const app = await draftFor(owner);
    const upload = await attachFile(
      api().post(`/api/applications/${app._id}/documents`).set(owner.auth).field('type', 'photo')
    );
    const docId = upload.body.data.document._id;

    const res = await api().get(`/api/documents/${docId}/file`).set(stranger.auth);
    expect(res.status).toBe(403);
  });

  test('an applicant cannot mark their own document as approved', async () => {
    const app = await draftFor(owner);
    const upload = await attachFile(
      api().post(`/api/applications/${app._id}/documents`).set(owner.auth).field('type', 'photo')
    );
    const docId = upload.body.data.document._id;

    const res = await api()
      .patch(`/api/documents/${docId}/review`)
      .set(owner.auth)
      .send({ reviewStatus: 'approved' });

    expect(res.status).toBe(403);
  });

  test('a verifier reviews a document and must give a reason when refusing', async () => {
    const app = await draftFor(owner);
    const upload = await attachFile(
      api().post(`/api/applications/${app._id}/documents`).set(owner.auth).field('type', 'photo')
    );
    const docId = upload.body.data.document._id;

    const noReason = await api()
      .patch(`/api/documents/${docId}/review`)
      .set(verifier.auth)
      .send({ reviewStatus: 'rejected' });
    expect(noReason.status).toBe(400);

    const approved = await api()
      .patch(`/api/documents/${docId}/review`)
      .set(verifier.auth)
      .send({ reviewStatus: 'approved', remark: 'Looks clear' });

    expect(approved.status).toBe(200);
    expect(approved.body.data.document.reviewStatus).toBe('approved');
    expect(approved.body.data.document.reviewedBy).toBeTruthy();
  });

  test('an officer can also read documents', async () => {
    const officer = await makeUser(ROLES.OFFICER);
    const app = await draftFor(owner);
    const upload = await attachFile(
      api().post(`/api/applications/${app._id}/documents`).set(owner.auth).field('type', 'photo')
    );
    const docId = upload.body.data.document._id;

    const res = await api().get(`/api/documents/${docId}/file`).set(officer.auth);
    expect(res.status).toBe(200);
  });
});
