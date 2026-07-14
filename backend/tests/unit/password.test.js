import test from 'node:test';
import assert from 'node:assert/strict';
import { hashPassword, verifyPassword } from '../../src/utils/password.js';

test('hashPassword produces a non-plaintext hash', async () => {
  const hash = await hashPassword('correct-horse-battery-staple');
  assert.notEqual(hash, 'correct-horse-battery-staple');
  assert.ok(hash.startsWith('$2'));
});

test('verifyPassword accepts the original', async () => {
  const hash = await hashPassword('correct-horse-battery-staple');
  assert.equal(await verifyPassword('correct-horse-battery-staple', hash), true);
});

test('verifyPassword rejects other inputs', async () => {
  const hash = await hashPassword('correct-horse-battery-staple');
  assert.equal(await verifyPassword('wrong', hash), false);
});
