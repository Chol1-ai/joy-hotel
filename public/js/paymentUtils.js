(function (root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
  root.formatPaymentMethodLabel = api.formatPaymentMethodLabel;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  function formatPaymentMethodLabel(method) {
    if (!method || method === 'none') {
      return 'Pay later';
    }

    return String(method).replace(/_/g, ' ');
  }

  return { formatPaymentMethodLabel };
});
