import test from 'node:test';
import assert from 'node:assert/strict';
import { buildRoomId, parseRoomId, peerOf, roomContains } from '../../src/utils/roomId.js';

test('buildRoomId is deterministic regardless of ordering', () => {
  const a = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  const b = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
  assert.equal(buildRoomId(a, b), buildRoomId(b, a));
});

test('buildRoomId rejects self-conversations', () => {
  const id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  assert.throws(() => buildRoomId(id, id), /yourself/);
});

test('parseRoomId returns the two ids', () => {
  const a = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  const b = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
  const roomId = buildRoomId(a, b);
  const [x, y] = parseRoomId(roomId);
  assert.equal(x, a);
  assert.equal(y, b);
});

test('peerOf returns the other participant', () => {
  const a = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  const b = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
  const roomId = buildRoomId(a, b);
  assert.equal(peerOf(roomId, a), b);
  assert.equal(peerOf(roomId, b), a);
});

test('roomContains verifies membership', () => {
  const a = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  const b = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
  const c = 'cccccccc-cccc-cccc-cccc-cccccccccccc';
  const roomId = buildRoomId(a, b);
  assert.equal(roomContains(roomId, a), true);
  assert.equal(roomContains(roomId, b), true);
  assert.equal(roomContains(roomId, c), false);
});
