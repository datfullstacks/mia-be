var crypto = require('crypto');
var paymentStore = require('./payment.store');
var authService = require('../auth/auth.service');
var pagination = require('../../lib/pagination');

function mapPayment(record) {
  return {
    id: record.id,
    paymentRef: record.paymentRef,
    amount: record.amount,
    note: record.note,
    status: record.status,
    createdAt: record.createdAt,
    userId: record.userId,
    reviewedAt: record.reviewedAt || null,
    reviewedBy: record.reviewedBy || null,
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

      return [payment.paymentRef, payment.note, payment.userId].some(function (value) {
        return String(value || '')
          .toLowerCase()
          .includes(searchTerm);
      });
    })
    .sort(function (left, right) {
      return new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime();
    });
}

exports.listPaymentsForUser = async function listPaymentsForUser(userId) {
  return (await paymentStore.getAll())
    .filter(function (payment) {
      return payment.userId === userId;
    })
    .map(mapPayment);
};

exports.createPaymentRequest = async function createPaymentRequest(user, payload) {
  var nextNumber = (await paymentStore.count()) + 1;
  var record = await paymentStore.insert({
    id: crypto.randomUUID(),
    paymentRef: 'PAY-' + String(nextNumber).padStart(6, '0'),
    amount: payload.amount,
    note: payload.note || '',
    status: 'pending',
    userId: user.id,
    createdAt: new Date().toISOString(),
    reviewedAt: null,
    reviewedBy: null,
  });

  return mapPayment(record);
};

exports.approvePayment = async function approvePayment(paymentId, adminUserId) {
  var payment = await paymentStore.findById(paymentId);

  if (!payment) {
    var notFoundError = new Error('Payment request not found');
    notFoundError.statusCode = 404;
    throw notFoundError;
  }

  if (payment.status === 'approved') {
    var approvedError = new Error('Payment request has already been approved');
    approvedError.statusCode = 409;
    throw approvedError;
  }

  var updatedPayment = await paymentStore.update({
    id: payment.id,
    paymentRef: payment.paymentRef,
    amount: payment.amount,
    note: payment.note,
    status: 'approved',
    userId: payment.userId,
    createdAt: payment.createdAt,
    reviewedAt: new Date().toISOString(),
    reviewedBy: adminUserId,
  });

  if (await authService.getUserRecordById(payment.userId)) {
    await authService.updateUserTier(payment.userId, 'pro');
  }

  return mapPayment(updatedPayment);
};

exports.getPaymentStats = async function getPaymentStats() {
  var payments = await paymentStore.getAll();

  return {
    totalPayments: payments.length,
    pendingPayments: payments.filter(function (payment) {
      return payment.status === 'pending';
    }).length,
  };
};

exports.listAllPayments = async function listAllPayments(options) {
  var items = filterPayments(
    (await paymentStore.getAll()).map(mapPayment),
    options,
  );
  var paging = pagination.getPaginationOptions(options, {
    page: 1,
    pageSize: 5,
    maxPageSize: 20,
  });

  return pagination.paginateItems(items, paging);
};
