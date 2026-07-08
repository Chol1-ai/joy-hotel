const test = require('node:test');
const assert = require('node:assert/strict');

const { formatPaymentMethodLabel } = require('../public/js/paymentUtils');

test('formats undefined payment methods safely', () => {
  assert.equal(formatPaymentMethodLabel(undefined), 'Pay later');
});

test('formats payment methods with underscores', () => {
  assert.equal(formatPaymentMethodLabel('mobile_money'), 'mobile money');
});
