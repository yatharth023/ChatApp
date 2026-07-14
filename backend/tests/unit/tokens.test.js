import test from 'node:test';
import assert from 'node:assert/strict';
import {
  generateJti,
  signAccessToken,
  signRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
} from '../../src/utils/tokens.js';

test('generateJti returns a hex string of expected length', () => {
  const jti = generateJti();
  assert.match(jti, /^[a-f0-9]{64}$/);
});

test('access token roundtrip preserves claims', () => {
  const token = signAccessToken({ sub: 'user-1', tv: 3 });
  const claims = verifyAccessToken(token);
  assert.equal(claims.sub, 'user-1');
  assert.equal(claims.tv, 3);
});

test('refresh token roundtrip preserves claims', () => {
  const token = signRefreshToken({ sub: 'user-1', jti: 'abc', tv: 1 });
  const claims = verifyRefreshToken(token);
  assert.equal(claims.sub, 'user-1');
  assert.equal(claims.jti, 'abc');
});

test('verifyAccessToken rejects tokens signed by refresh secret', () => {
  const refresh = signRefreshToken({ sub: 'user-1', jti: 'x', tv: 1 });
  assert.throws(() => verifyAccessToken(refresh));
});
