var crypto = require('crypto');

var getEnv = require('../../config/env');
var pagination = require('../../lib/pagination');
var authService = require('../auth/auth.service');
var paymentStore = require('./payment.store');

var env = getEnv();
var SUCCESS_STATUSES = ['paid', 'approved_manual'];
var historicalRefsSynced = false;

function getProPlanAmount() {
  var amount = Number.parseInt(env.proPlanAmount, 10);

  if (!Number.isInteger(amount) || amount <= 0) {
    return 99000;
  }

  return amount;
}

function getPaymentExpiryMinutes() {
  var minutes = Number.parseInt(env.paymentExpiryMinutes, 10);

  if (!Number.isInteger(minutes) || minutes < 1) {
    return 15;
  }

  return minutes;
}

function createPaymentRef() {
  return (
    'MIAPRO' +
    Date.now().toString(36).toUpperCase() +
    crypto.randomBytes(3).toString('hex').toUpperCase()
  );
}

function normalizePaymentRef(paymentRef) {
  return String(paymentRef || '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '');
}

function extractPaymentRefFromText() {
  for (var index = 0; index < arguments.length; index += 1) {
    var source = String(arguments[index] || '').toUpperCase();

    if (!source) {
      continue;
    }

    var matchedRef = source.match(/MIAPRO[A-Z0-9]+/);

    if (matchedRef && matchedRef[0]) {
      return matchedRef[0];
    }
  }

  return '';
}

function createError(message, statusCode) {
  var error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function buildQrUrl(record) {
  return (
    'https://qr.sepay.vn/img?acc=' +
    encodeURIComponent(record.accountNumber) +
    '&bank=' +
    encodeURIComponent(record.bankName) +
    '&amount=' +
    encodeURIComponent(String(record.amount)) +
    '&des=' +
    encodeURIComponent(record.paymentRef)
  );
}

function ensurePaymentConfig() {
  if (!env.sepayBankAccount || !env.sepayBankName) {
    throw createError(
      'SEPAY_BANK_ACCOUNT and SEPAY_BANK_NAME must be configured before creating checkout QR codes',
      500,
    );
  }
}

function mapPayment(record) {
  return {
    id: record.id,
    paymentRef: record.paymentRef,
    amount: record.amount,
    note: record.note,
    status: record.status,
    createdAt: record.createdAt,
    expiresAt: record.expiresAt || null,
    paidAt: record.paidAt || null,
    userId: record.userId,
    reviewedAt: record.reviewedAt || null,
    reviewedBy: record.reviewedBy || null,
    provider: record.provider || 'sepay_qr',
    providerTransactionId: record.providerTransactionId || null,
    bankName: record.bankName || '',
    accountNumber: record.accountNumber || '',
    accountName: record.accountName || '',
    qrUrl:
      record.accountNumber && record.bankName
        ? buildQrUrl(record)
        : null,
  };
}

function filterPayments(payments, options) {
  var statusFilter = options && options.status ? String(options.status).toLowerCase() : 'all';
  var searchTerm = options && options.search ? String(options.search).trim().toLowerCase() : '';

  return payments
    .filter(function (payment) {
      if (statusFilter !== 'all' && payment.status !== statusFilter) {
        return false;
      }

      if (!searchTerm) {
        return true;
      }

      return [
        payment.paymentRef,
        payment.note,
        payment.userId,
        payment.providerTransactionId,
        payment.bankName,
        payment.accountNumber,
      ].some(function (value) {
        return String(value || '')
          .toLowerCase()
          .includes(searchTerm);
      });
    })
    .sort(function (left, right) {
      return new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime();
    });
}

function extractWebhookData(payload) {
  var transaction = payload && typeof payload.transaction === 'object' ? payload.transaction : {};
  var order = payload && typeof payload.order === 'object' ? payload.order : {};
  var notificationType = String(payload.notification_type || '').toUpperCase();
  var transferType = String(
    payload.transferType ||
      payload.transfer_type ||
      (notificationType === 'ORDER_PAID' ? 'in' : ''),
  )
    .trim()
    .toLowerCase();
  var rawPaymentRef = String(
    payload.code ||
      payload.payment_code ||
      order.order_invoice_number ||
      order.order_id ||
      '',
  ).trim();
  var paymentRef = rawPaymentRef || extractPaymentRefFromText(
    payload.content,
    payload.description,
    transaction.description,
    transaction.content,
  );
  var amount = Number(
    payload.transferAmount ||
      payload.transfer_amount ||
      transaction.transaction_amount ||
      payload.amount ||
      order.order_amount ||
      0,
  );
  var transactionId = String(
    payload.id ||
      transaction.id ||
      transaction.transaction_id ||
      payload.transaction_id ||
      '',
  ).trim();

  return {
    transactionId: transactionId,
    paymentRef: paymentRef,
    transferAmount: Number.isFinite(amount) ? amount : 0,
    transferType: transferType,
    isIncoming:
      transferType === 'in' ||
      transferType === 'credit' ||
      notificationType === 'ORDER_PAID',
  };
}

function isAuthorizedSePayRequest(authorizationHeader, secretKeyHeader) {
  if (!env.sepayWebhookApiKey) {
    throw createError('SEPAY_WEBHOOK_API_KEY is not configured', 500);
  }

  var expectedAuthorization = 'Apikey ' + env.sepayWebhookApiKey;

  return (
    authorizationHeader === expectedAuthorization ||
    authorizationHeader === env.sepayWebhookApiKey ||
    secretKeyHeader === env.sepayWebhookApiKey
  );
}

function isExpired(payment) {
  return (
    payment &&
    payment.status === 'pending' &&
    payment.expiresAt &&
    new Date(payment.expiresAt).getTime() <= Date.now()
  );
}

async function syncPaymentExpiry(payment) {
  if (!isExpired(payment)) {
    return payment;
  }

  return paymentStore.update({
    id: payment.id,
    paymentRef: payment.paymentRef,
    paymentRefNormalized: payment.paymentRefNormalized || normalizePaymentRef(payment.paymentRef),
    amount: payment.amount,
    note: payment.note,
    status: 'expired',
    userId: payment.userId,
    createdAt: payment.createdAt,
    expiresAt: payment.expiresAt,
    paidAt: payment.paidAt || null,
    reviewedAt: payment.reviewedAt || null,
    reviewedBy: payment.reviewedBy || null,
    provider: payment.provider || 'sepay_qr',
    providerTransactionId: payment.providerTransactionId || null,
    providerPayload: payment.providerPayload || null,
    bankName: payment.bankName || '',
    accountNumber: payment.accountNumber || '',
    accountName: payment.accountName || '',
  });
}

async function syncPaymentsExpiry(payments) {
  return Promise.all(
    payments.map(function (payment) {
      return syncPaymentExpiry(payment);
    }),
  );
}

async function activateProForUser(userId) {
  if (await authService.getUserRecordById(userId)) {
    await authService.updateUserTier(userId, 'pro');
  }
}

async function recordWebhook(event, payload) {
  try {
    await paymentStore.insertWebhookLog({
      id: event.transactionId,
      paymentRef: event.paymentRef || null,
      transferAmount: event.transferAmount,
      transferType: event.transferType,
      payload: payload,
      receivedAt: new Date().toISOString(),
    });
  } catch (error) {
    if (error && error.code === 11000) {
      return;
    }

    throw error;
  }
}

async function findPaymentByWebhookRef(paymentRef) {
  var exactPayment = await paymentStore.findByPaymentRef(paymentRef);

  if (exactPayment) {
    return exactPayment;
  }

  var normalizedRef = normalizePaymentRef(paymentRef);

  if (!normalizedRef) {
    return null;
  }

  return paymentStore.findByPaymentRefNormalized(normalizedRef);
}

function assertPaymentOwnership(payment, userId) {
  if (!payment || payment.userId !== userId) {
    throw createError('Payment request not found', 404);
  }
}

exports.listPaymentsForUser = async function listPaymentsForUser(userId) {
  return (await syncPaymentsExpiry(await paymentStore.getAll()))
    .filter(function (payment) {
      return payment.userId === userId;
    })
    .map(mapPayment);
};

exports.getPaymentForUser = async function getPaymentForUser(userId, paymentId) {
  var payment = await syncPaymentExpiry(await paymentStore.findById(paymentId));

  assertPaymentOwnership(payment, userId);

  return mapPayment(payment);
};

exports.createPaymentRequest = async function createPaymentRequest(user, payload) {
  ensurePaymentConfig();

  if (user.tier === 'pro') {
    throw createError('This account is already on the Pro tier', 409);
  }

  var userPayments = (await syncPaymentsExpiry(await paymentStore.getAll())).filter(function (payment) {
    return payment.userId === user.id;
  });
  var existingPending = userPayments
    .sort(function (left, right) {
      return new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime();
    })
    .find(function (payment) {
      return payment.status === 'pending';
    });

  if (existingPending) {
    return mapPayment(existingPending);
  }

  var now = Date.now();
  var paymentRef = createPaymentRef();
  var record = await paymentStore.insert({
    id: crypto.randomUUID(),
    paymentRef: paymentRef,
    paymentRefNormalized: normalizePaymentRef(paymentRef),
    amount: getProPlanAmount(),
    note: payload.note || '',
    status: 'pending',
    userId: user.id,
    createdAt: new Date(now).toISOString(),
    expiresAt: new Date(now + getPaymentExpiryMinutes() * 60 * 1000).toISOString(),
    paidAt: null,
    reviewedAt: null,
    reviewedBy: null,
    provider: 'sepay_qr',
    providerTransactionId: null,
    providerPayload: null,
    bankName: env.sepayBankName,
    accountNumber: env.sepayBankAccount,
    accountName: env.sepayAccountName,
  });

  return mapPayment(record);
};

exports.approvePayment = async function approvePayment(paymentId, adminUserId) {
  var payment = await syncPaymentExpiry(await paymentStore.findById(paymentId));

  if (!payment) {
    throw createError('Payment request not found', 404);
  }

  if (SUCCESS_STATUSES.includes(payment.status)) {
    throw createError('Payment request has already been completed', 409);
  }

  var approvedAt = new Date().toISOString();
  var updatedPayment = await paymentStore.update({
    id: payment.id,
    paymentRef: payment.paymentRef,
    paymentRefNormalized: payment.paymentRefNormalized || normalizePaymentRef(payment.paymentRef),
    amount: payment.amount,
    note: payment.note,
    status: 'approved_manual',
    userId: payment.userId,
    createdAt: payment.createdAt,
    expiresAt: payment.expiresAt || null,
    paidAt: payment.paidAt || approvedAt,
    reviewedAt: approvedAt,
    reviewedBy: adminUserId,
    provider: payment.provider || 'sepay_qr',
    providerTransactionId: payment.providerTransactionId || null,
    providerPayload: payment.providerPayload || null,
    bankName: payment.bankName || '',
    accountNumber: payment.accountNumber || '',
    accountName: payment.accountName || '',
  });

  await activateProForUser(payment.userId);

  return mapPayment(updatedPayment);
};

exports.handleSePayWebhook = async function handleSePayWebhook(options) {
  if (!isAuthorizedSePayRequest(options.authorizationHeader, options.secretKeyHeader)) {
    throw createError('Invalid SePay webhook credentials', 401);
  }

  if (!options.payload || typeof options.payload !== 'object') {
    throw createError('Invalid SePay webhook payload', 400);
  }

  var event = extractWebhookData(options.payload);

  if (!event.transactionId) {
    throw createError('transactionId is required', 400);
  }

  if (await paymentStore.findWebhookLogByTransactionId(event.transactionId)) {
    return {
      duplicate: true,
      payment: null,
      reason: 'duplicate_transaction',
    };
  }

  await paymentStore.insertWebhookLog({
    id: event.transactionId,
    paymentRef: event.paymentRef || null,
    transferAmount: event.transferAmount,
    transferType: event.transferType,
    payload: options.payload,
    receivedAt: new Date().toISOString(),
  });

  if (!event.isIncoming || !event.paymentRef) {
    await recordWebhook(event, options.payload);

    return {
      duplicate: false,
      payment: null,
      reason: 'ignored_event',
    };
  }

  var payment = await findPaymentByWebhookRef(event.paymentRef);

  if (!payment) {
    await recordWebhook(event, options.payload);

    return {
      duplicate: false,
      payment: null,
      reason: 'payment_not_found',
    };
  }

  if (SUCCESS_STATUSES.includes(payment.status)) {
    await recordWebhook(event, options.payload);

    return {
      duplicate: false,
      payment: mapPayment(payment),
      reason: 'already_completed',
    };
  }

  if (event.transferAmount >= payment.amount) {
    var paidAt = new Date().toISOString();
    var completedPayment = await paymentStore.update({
      id: payment.id,
      paymentRef: payment.paymentRef,
      paymentRefNormalized: payment.paymentRefNormalized || normalizePaymentRef(payment.paymentRef),
      amount: payment.amount,
      note: payment.note,
      status: 'paid',
      userId: payment.userId,
      createdAt: payment.createdAt,
      expiresAt: payment.expiresAt || null,
      paidAt: payment.paidAt || paidAt,
      reviewedAt: payment.reviewedAt || null,
      reviewedBy: payment.reviewedBy || null,
      provider: payment.provider || 'sepay_qr',
      providerTransactionId: event.transactionId,
      providerPayload: options.payload,
      bankName: payment.bankName || '',
      accountNumber: payment.accountNumber || '',
      accountName: payment.accountName || '',
    });

    await activateProForUser(payment.userId);
    await recordWebhook(event, options.payload);

    return {
      duplicate: false,
      payment: mapPayment(completedPayment),
      reason: 'payment_completed',
    };
  }

  var reviewPayment = await paymentStore.update({
    id: payment.id,
    paymentRef: payment.paymentRef,
    paymentRefNormalized: payment.paymentRefNormalized || normalizePaymentRef(payment.paymentRef),
    amount: payment.amount,
    note: payment.note,
    status: 'pending_review',
    userId: payment.userId,
    createdAt: payment.createdAt,
    expiresAt: payment.expiresAt || null,
    paidAt: payment.paidAt || null,
    reviewedAt: payment.reviewedAt || null,
    reviewedBy: payment.reviewedBy || null,
    provider: payment.provider || 'sepay_qr',
    providerTransactionId: event.transactionId,
    providerPayload: options.payload,
    bankName: payment.bankName || '',
    accountNumber: payment.accountNumber || '',
    accountName: payment.accountName || '',
  });
  await recordWebhook(event, options.payload);

  return {
    duplicate: false,
    payment: mapPayment(reviewPayment),
    reason: 'payment_requires_review',
  };
};

exports.getPaymentStats = async function getPaymentStats() {
  var payments = await syncPaymentsExpiry(await paymentStore.getAll());

  return {
    totalPayments: payments.length,
    pendingPayments: payments.filter(function (payment) {
      return payment.status === 'pending';
    }).length,
    paidPayments: payments.filter(function (payment) {
      return SUCCESS_STATUSES.includes(payment.status);
    }).length,
    reviewPayments: payments.filter(function (payment) {
      return payment.status === 'pending_review';
    }).length,
  };
};

exports.listAllPayments = async function listAllPayments(options) {
  var items = filterPayments(
    (await syncPaymentsExpiry(await paymentStore.getAll())).map(mapPayment),
    options,
  );
  var paging = pagination.getPaginationOptions(options, {
    page: 1,
    pageSize: 5,
    maxPageSize: 20,
  });

  return pagination.paginateItems(items, paging);
};

exports.syncHistoricalPaymentRefs = async function syncHistoricalPaymentRefs() {
  if (historicalRefsSynced) {
    return 0;
  }

  var syncedCount = await paymentStore.backfillPaymentRefNormalized(normalizePaymentRef);
  historicalRefsSynced = true;
  return syncedCount;
};
