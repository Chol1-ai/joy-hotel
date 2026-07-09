function getPaymentProviderConfig(options = {}) {
  const env = options.env || process.env;
  const provider = (env.PAYMENT_PROVIDER || 'mock').toLowerCase();
  const configured = provider !== 'mock' && Boolean(
    (provider === 'flutterwave' && env.FLW_PUBLIC_KEY) ||
    (provider === 'paypal' && env.PAYPAL_CLIENT_ID) ||
    (provider === 'mtn' && env.MTN_API_KEY)
  );

  return {
    provider,
    configured,
    publicKey: env.FLW_PUBLIC_KEY || '',
    baseUrl: env.BASE_URL || 'http://localhost:3000',
  };
}

function buildCheckoutUrl({ config, booking, paymentMethod, phone, amount }) {
  if (!config || !config.configured || config.provider === 'mock') {
    return '';
  }

  if (config.provider === 'flutterwave') {
    const params = new URLSearchParams({
      public_key: config.publicKey,
      tx_ref: `${booking.confirmationCode}-${Date.now()}`,
      amount: String(amount),
      currency: 'UGX',
      customer: booking.fullName,
      customer_email: booking.email,
      phone_number: phone || '',
      payment_plan: paymentMethod === 'mobile_money' ? 'mobile-money' : 'card',
      redirect_url: `${config.baseUrl}/pay/complete?code=${booking.confirmationCode}`,
    });
    return `https://checkout.flutterwave.com/v3/hosted/pay?${params.toString()}`;
  }

  return '';
}

module.exports = {
  getPaymentProviderConfig,
  buildCheckoutUrl,
};
