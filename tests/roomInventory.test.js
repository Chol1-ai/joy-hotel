const test = require('node:test');
const assert = require('node:assert/strict');
const { normalizeRoom, reserveRoomNumber } = require('../lib/adminData');

test('normalizeRoom turns availability into a usable inventory shape', () => {
  const room = normalizeRoom({
    id: 'deluxe',
    name: 'Deluxe Room',
    availableCount: 3,
    roomNumbers: ['101', '102', '103'],
  });

  assert.equal(room.availableCount, 3);
  assert.deepEqual(room.roomNumbers, ['101', '102', '103']);
  assert.equal(room.status, 'available');
});

test('reserveRoomNumber removes one room number and lowers availability', () => {
  const room = normalizeRoom({
    id: 'deluxe',
    name: 'Deluxe Room',
    availableCount: 2,
    roomNumbers: ['101', '102'],
  });

  const result = reserveRoomNumber(room);

  assert.equal(result.roomNumber, '101');
  assert.equal(result.room.availableCount, 1);
  assert.deepEqual(result.room.roomNumbers, ['102']);
  assert.equal(result.room.status, 'available');
});
