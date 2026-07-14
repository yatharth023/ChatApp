import test from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { buildApp } from '../../src/app.js';

const app = buildApp();

test('GET /api/health returns ok', async () => {
  const res = await request(app).get('/api/health').expect(200);
  assert.equal(res.body.ok, true);
  assert.ok(res.body.at);
});
