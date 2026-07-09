const test = require('node:test');
const assert = require('node:assert/strict');

function loadMailModule() {
  delete require.cache[require.resolve('../lib/mail')];
  return require('../lib/mail');
}

test('resolveMailConfig uses Resend when an API key is present', () => {
  process.env.RESEND_API_KEY = 'test-key';
  delete process.env.RESEND_FROM_EMAIL;

  const mail = loadMailModule();
  const config = mail.resolveMailConfig();

  assert.equal(config.provider, 'resend');
  assert.equal(config.fromEmail, 'onboarding@resend.dev');
});

test('resolveMailConfig falls back to nodemailer when Resend is not configured', () => {
  delete process.env.RESEND_API_KEY;
  delete process.env.RESEND_FROM_EMAIL;

  const mail = loadMailModule();
  const config = mail.resolveMailConfig();

  assert.equal(config.provider, 'nodemailer');
  assert.equal(config.fromEmail, 'joyhotel33@gmail.com');
});
