var db = require('../../lib/db');

function mapPayment(document) {
  if (!document) {
    return null;
  }

  return {
    id: document._id,
    paymentRef: document.paymentRef,
    paymentRefNormalized: document.paymentRefNormalized || null,
    amount: document.amount,
    note: document.note,
    status: document.status,
    userId: document.userId,
    createdAt: document.createdAt,
    expiresAt: document.expiresAt || null,
    paidAt: document.paidAt || null,
    reviewedAt: document.reviewedAt || null,
    reviewedBy: document.reviewedBy || null,
    provider: document.provider || 'sepay_qr',
    providerTransactionId: document.providerTransactionId || null,
    providerPayload: document.providerPayload || null,
    bankName: document.bankName || '',
    accountNumber: document.accountNumber || '',
    accountName: document.accountName || '',
  };
}

function mapWebhookLog(document) {
  if (!document) {
    return null;
  }

  return {
    id: document._id,
    paymentRef: document.paymentRef || null,
    transferAmount: document.transferAmount || 0,
    transferType: document.transferType || '',
    payload: document.payload || null,
    receivedAt: document.receivedAt,
  };
}

exports.getAll = async function getAll() {
  return db
    .getCollection('payments')
    .find({}, { sort: { createdAt: -1 } })
    .toArray()
    .then(function (documents) {
      return documents.map(mapPayment);
    });
};

exports.findById = async function findById(paymentId) {
  return mapPayment(await db.getCollection('payments').findOne({ _id: paymentId }));
};

exports.findByPaymentRef = async function findByPaymentRef(paymentRef) {
  return mapPayment(await db.getCollection('payments').findOne({ paymentRef: paymentRef }));
};

exports.findByPaymentRefNormalized = async function findByPaymentRefNormalized(paymentRefNormalized) {
  return mapPayment(
    await db.getCollection('payments').findOne({ paymentRefNormalized: paymentRefNormalized }),
  );
};

exports.count = async function count() {
  return db.getCollection('payments').countDocuments();
};

exports.insert = async function insert(record) {
  await db.getCollection('payments').insertOne({
    _id: record.id,
    paymentRef: record.paymentRef,
    paymentRefNormalized: record.paymentRefNormalized || null,
    amount: record.amount,
    note: record.note,
    status: record.status,
    userId: record.userId,
    createdAt: record.createdAt,
    expiresAt: record.expiresAt || null,
    paidAt: record.paidAt || null,
    reviewedAt: record.reviewedAt || null,
    reviewedBy: record.reviewedBy || null,
    provider: record.provider || 'sepay_qr',
    providerTransactionId: record.providerTransactionId || null,
    providerPayload: record.providerPayload || null,
    bankName: record.bankName || '',
    accountNumber: record.accountNumber || '',
    accountName: record.accountName || '',
  });

  return record;
};

exports.update = async function update(updatedRecord) {
  await db.getCollection('payments').updateOne(
    { _id: updatedRecord.id },
    {
      $set: {
        paymentRef: updatedRecord.paymentRef,
        paymentRefNormalized: updatedRecord.paymentRefNormalized || null,
        amount: updatedRecord.amount,
        note: updatedRecord.note,
        status: updatedRecord.status,
        userId: updatedRecord.userId,
        createdAt: updatedRecord.createdAt,
        expiresAt: updatedRecord.expiresAt || null,
        paidAt: updatedRecord.paidAt || null,
        reviewedAt: updatedRecord.reviewedAt || null,
        reviewedBy: updatedRecord.reviewedBy || null,
        provider: updatedRecord.provider || 'sepay_qr',
        providerTransactionId: updatedRecord.providerTransactionId || null,
        providerPayload: updatedRecord.providerPayload || null,
        bankName: updatedRecord.bankName || '',
        accountNumber: updatedRecord.accountNumber || '',
        accountName: updatedRecord.accountName || '',
      },
    },
  );

  return updatedRecord;
};

exports.backfillPaymentRefNormalized = async function backfillPaymentRefNormalized(normalizePaymentRef) {
  var collection = db.getCollection('payments');
  var documents = await collection.find({}).toArray();
  var syncedCount = 0;

  for (var index = 0; index < documents.length; index += 1) {
    var document = documents[index];
    var nextNormalized = normalizePaymentRef(document.paymentRef || '');

    if (!nextNormalized || document.paymentRefNormalized === nextNormalized) {
      continue;
    }

    await collection.updateOne(
      { _id: document._id },
      {
        $set: {
          paymentRefNormalized: nextNormalized,
        },
      },
    );
    syncedCount += 1;
  }

  return syncedCount;
};

exports.findWebhookLogByTransactionId = async function findWebhookLogByTransactionId(transactionId) {
  return mapWebhookLog(await db.getCollection('payment_webhook_logs').findOne({ _id: transactionId }));
};

exports.insertWebhookLog = async function insertWebhookLog(record) {
  await db.getCollection('payment_webhook_logs').insertOne({
    _id: record.id,
    paymentRef: record.paymentRef || null,
    transferAmount: record.transferAmount || 0,
    transferType: record.transferType || '',
    payload: record.payload || null,
    receivedAt: record.receivedAt,
  });

  return record;
};
