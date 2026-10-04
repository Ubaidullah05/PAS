const { startDb, stopDb, api, makeUser } = require('./helpers');
const { ROLES } = require('../src/config/rbac');

beforeAll(async () => {
  await startDb();
});

afterAll(async () => {
  await stopDb();
});

describe('Authentication', () => {
  test('an applicant can sign up and gets a token', async () => {
    const res = await api()
      .post('/api/auth/register')
      .send({ name: 'Asha Patel', email: 'asha@example.com', password: 'Secret@123', phone: '9876543210' });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.token).toBeTruthy();
    expect(res.body.data.user.role).toBe(ROLES.APPLICANT);
    expect(res.body.data.user).not.toHaveProperty('password');
  });

  test('the public sign up form refuses staff roles', async () => {
    const res = await api()
      .post('/api/auth/register')
      .send({ name: 'Sneaky Admin', email: 'sneaky@example.com', password: 'Secret@123', role: ROLES.ADMIN });

    expect(res.status).toBe(403);
    expect(res.body.message).toMatch(/administrator/i);
  });

  test('the same email cannot be used twice', async () => {
    await api()
      .post('/api/auth/register')
      .send({ name: 'First User', email: 'dupe@example.com', password: 'Secret@123' })
      .expect(201);

    const res = await api()
      .post('/api/auth/register')
      .send({ name: 'Second User', email: 'dupe@example.com', password: 'Secret@123' });

    expect(res.status).toBe(409);
  });

  test('weak passwords are rejected', async () => {
    const res = await api()
      .post('/api/auth/register')
      .send({ name: 'Weak Password', email: 'weak@example.com', password: '123' });

    expect(res.status).toBe(400);
    expect(res.body.errors.join(' ')).toMatch(/8 characters/i);
  });

  test('a wrong password is refused', async () => {
    await api()
      .post('/api/auth/register')
      .send({ name: 'Login User', email: 'login@example.com', password: 'Secret@123' })
      .expect(201);

    const res = await api()
      .post('/api/auth/login')
      .send({ email: 'login@example.com', password: 'WrongPass123' });

    expect(res.status).toBe(401);
  });

  test('a correct password returns the user profile', async () => {
    await api()
      .post('/api/auth/register')
      .send({ name: 'Good Login', email: 'good@example.com', password: 'Secret@123' })
      .expect(201);

    const res = await api()
      .post('/api/auth/login')
      .send({ email: 'good@example.com', password: 'Secret@123' });

    expect(res.status).toBe(200);
    expect(res.body.data.user.name).toBe('Good Login');
    expect(res.body.data.home).toBe('/dashboard');
  });

  test('the profile route needs a token', async () => {
    const res = await api().get('/api/auth/me');
    expect(res.status).toBe(401);
  });

  test('a signed in user can read their own profile', async () => {
    const { auth, user } = await makeUser(ROLES.APPLICANT);
    const res = await api().get('/api/auth/me').set(auth);

    expect(res.status).toBe(200);
    expect(res.body.data.user.email).toBe(user.email);
  });

  test('a suspended account cannot sign in', async () => {
    const { user } = await makeUser(ROLES.APPLICANT);
    user.status = 'suspended';
    await user.save();

    const res = await api()
      .post('/api/auth/login')
      .send({ email: user.email, password: 'Secret@123' });

    expect(res.status).toBe(403);
  });

  test('a forged token is refused', async () => {
    const res = await api()
      .get('/api/auth/me')
      .set({ Authorization: 'Bearer not.a.real.token' });

    expect(res.status).toBe(401);
  });

  test('changing the password signs other sessions out', async () => {
    const { auth, user } = await makeUser(ROLES.APPLICANT);

    const changed = await api()
      .put('/api/auth/password')
      .set(auth)
      .send({ currentPassword: 'Secret@123', newPassword: 'NewSecret@123' });

    expect(changed.status).toBe(200);

    const oldToken = await api().get('/api/auth/me').set(auth);
    expect(oldToken.status).toBe(401);

    const login = await api()
      .post('/api/auth/login')
      .send({ email: user.email, password: 'NewSecret@123' });
    expect(login.status).toBe(200);
  });
});
