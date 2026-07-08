const test = require('node:test');
const assert = require('node:assert/strict');
const { getPaymentProviderConfig, buildCheckoutUrl } = require('../lib/payments');

test('returns mock config when no provider credentials are configured', () => {
  const config = getPaymentProviderConfig({
    env: { PAYMENT_PROVIDER: 'mock' },
  });

  assert.equal(config.provider, 'mock');
  assert.equal(config.configured, false);
});

test('builds a flutterwave checkout URL when credentials are present', () => {
  const config = getPaymentProviderConfig({
    env: {
      PAYMENT_PROVIDER: 'flutterwave',
      FLW_PUBLIC_KEY: 'fake-public-key',
      BASE_URL: 'https://example.com',
    },
  });

  const url = buildCheckoutUrl({
    config,
    booking: { confirmationCode: 'JOY-TEST1', fullName: 'Jane', email: 'jane@example.com' },
    paymentMethod: 'mobile_money',
    phone: '+256700000000',
    amount: 180000,
  });

  assert.equal(config.provider, 'flutterwave');
  assert.equal(config.configured, true);
  assert.match(url, /checkout\.flutterwave\.com/);
  assert.match(url, /public_key=fake-public-key/);
});
