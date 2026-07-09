const test = require('node:test');
const assert = require('node:assert/strict');
const { normalizeRoom, reserveRoomNumber, allocateRoomNumberForBooking } = require('../lib/adminData');

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

test('normalizeRoom expands room numbers when availability is raised without explicit room numbers', () => {
  const room = normalizeRoom({
    id: 'executive',
    name: 'Executive Suite',
    availableCount: 4,
    roomNumbers: [],
  });

  assert.equal(room.availableCount, 4);
  assert.deepEqual(room.roomNumbers, ['201', '202', '203', '204']);
});

test('allocateRoomNumberForBooking makes a room available again after checkout', () => {
  const room = normalizeRoom({
    id: 'deluxe',
    name: 'Deluxe Room',
    availableCount: 1,
    roomNumbers: ['101'],
  });

  const bookings = [{
    status: 'confirmed',
    roomTypes: ['Deluxe Room'],
    assignedRoomNumbers: ['Deluxe Room: Room 101'],
    checkIn: new Date('2026-07-08T00:00:00Z'),
    checkOut: new Date('2026-07-09T12:00:00Z'),
  }];

  const result = allocateRoomNumberForBooking(
    room,
    bookings,
    new Date('2026-07-10T12:00:00Z'),
    new Date('2026-07-12T12:00:00Z'),
  );

  assert.equal(result.roomNumber, '101');
});
