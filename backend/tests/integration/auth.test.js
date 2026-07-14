import test from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { buildApp } from '../../src/app.js';
import { prisma } from '../../src/config/prisma.js';

const app = buildApp();

const clean = async () => {
  await prisma.userSession.deleteMany({});
  await prisma.refreshToken.deleteMany({});
  await prisma.user.deleteMany({ where: { email: { contains: 'test-auth' } } });
};

test('register → login → me → logout roundtrip', async (t) => {
  t.after(async () => {
    await clean();
    await prisma.$disconnect();
  });
  await clean();

  const registration = await request(app)
    .post('/api/auth/register')
    .send({
      username: `test_auth_${Date.now()}`,
      email: `test-auth-${Date.now()}@example.com`,
      password: 'Correct-horse-1',
    })
    .expect(201);

  assert.ok(registration.body.accessToken);
  assert.ok(registration.body.user);
  const { accessToken, user } = registration.body;

  const me = await request(app)
    .get('/api/auth/me')
    .set('Authorization', `Bearer ${accessToken}`)
    .expect(200);
  assert.equal(me.body.user.id, user.id);

  await request(app)
    .post('/api/auth/logout')
    .set('Authorization', `Bearer ${accessToken}`)
    .expect(204);
});

test('login rejects wrong password', async (t) => {
  t.after(async () => {
    await clean();
    await prisma.$disconnect();
  });
  await clean();

  await request(app)
    .post('/api/auth/register')
    .send({
      username: `test_auth_${Date.now()}`,
      email: `test-auth-${Date.now()}@example.com`,
      password: 'Correct-horse-1',
    })
    .expect(201);

  const response = await request(app)
    .post('/api/auth/login')
    .send({ email: `test-auth-${Date.now()}@example.com`, password: 'nope' })
    .expect(401);

  assert.equal(response.body.error.code, 'INVALID_CREDENTIALS');
});
