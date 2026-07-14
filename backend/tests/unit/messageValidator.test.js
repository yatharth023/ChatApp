import test from 'node:test';
import assert from 'node:assert/strict';
import { sendMessageSchema } from '../../src/validators/messageValidator.js';

const baseValid = {
  clientMessageId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  receiverId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
  encryptedPayload: 'ciphertext',
  iv: 'ivbase64',
};

test('accepts a well-formed text message', () => {
  const parsed = sendMessageSchema.parse(baseValid);
  assert.equal(parsed.receiverId, baseValid.receiverId);
});

test('rejects unknown expiry values', () => {
  assert.throws(() => sendMessageSchema.parse({ ...baseValid, expiresInSeconds: 42 }));
});

test('accepts allowlisted expiry values', () => {
  const parsed = sendMessageSchema.parse({ ...baseValid, expiresInSeconds: 3600 });
  assert.equal(parsed.expiresInSeconds, 3600);
});

test('requires text or media', () => {
  assert.throws(() =>
    sendMessageSchema.parse({ ...baseValid, encryptedPayload: '' }),
  );
});
