var db = require('../../lib/db');

function mapPayment(document) {
  if (!document) {
    return null;
  }

  return {
    id: document._id,
    paymentRef: document.paymentRef,
    amount: document.amount,
    note: document.note,
    status: document.status,
    userId: document.userId,
    createdAt: document.createdAt,
    reviewedAt: document.reviewedAt || null,
    reviewedBy: document.reviewedBy || null,
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

exports.count = async function count() {
  return db.getCollection('payments').countDocuments();
};

exports.insert = async function insert(record) {
  await db.getCollection('payments').insertOne({
    _id: record.id,
    paymentRef: record.paymentRef,
    amount: record.amount,
    note: record.note,
    status: record.status,
    userId: record.userId,
    createdAt: record.createdAt,
    reviewedAt: record.reviewedAt || null,
    reviewedBy: record.reviewedBy || null,
  });

  return record;
};

exports.update = async function update(updatedRecord) {
  await db.getCollection('payments').updateOne(
    { _id: updatedRecord.id },
    {
      $set: {
        paymentRef: updatedRecord.paymentRef,
        amount: updatedRecord.amount,
        note: updatedRecord.note,
        status: updatedRecord.status,
        userId: updatedRecord.userId,
        createdAt: updatedRecord.createdAt,
        reviewedAt: updatedRecord.reviewedAt || null,
        reviewedBy: updatedRecord.reviewedBy || null,
      },
    },
  );

  return updatedRecord;
};
