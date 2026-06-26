const { v4: uuid } = require("uuid");

const simulateLatency = () =>
  new Promise((resolve) => setTimeout(resolve, 500));

const charge = async (amount, currency, paymentMethodId) => {
  await simulateLatency();

  const roll = Math.random();

  if (roll > 0.2) {
    return {
      success: true,
      gatewayRef: `mock_${uuid().replace(/-/g, "").slice(0, 16)}`,
      raw: {
        processor: "mock",
        amount,
        currency,
        paymentMethodId: paymentMethodId || "pm_mock",
        status: "captured",
        timestamp: new Date().toISOString(),
      },
    };
  }

  const failures = [
    { code: "card_declined",       message: "Card was declined" },
    { code: "insufficient_funds",  message: "Insufficient funds" },
    { code: "do_not_honor",        message: "Transaction not permitted by issuer" },
    { code: "expired_card",        message: "Card has expired" },
  ];

  const failure = failures[Math.floor(Math.random() * failures.length)];

  return {
    success: false,
    failureCode: failure.code,
    failureMessage: failure.message,
    raw: {
      processor: "mock",
      amount,
      currency,
      status: "declined",
      reason: failure.code,
      timestamp: new Date().toISOString(),
    },
  };
};

const refund = async (amount, currency, gatewayRef) => {
  await simulateLatency();

  if (Math.random() > 0.1) {
    return {
      success: true,
      gatewayRef: `mock_refund_${uuid().replace(/-/g, "").slice(0, 12)}`,
      raw: {
        processor: "mock",
        amount,
        currency,
        originalRef: gatewayRef,
        status: "refunded",
        timestamp: new Date().toISOString(),
      },
    };
  }

  return {
    success: false,
    failureCode: "refund_failed",
    failureMessage: "Refund could not be processed",
    raw: { processor: "mock", status: "refund_declined", timestamp: new Date().toISOString() },
  };
};

module.exports = { charge, refund };
