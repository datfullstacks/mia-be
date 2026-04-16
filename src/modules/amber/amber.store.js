var db = require('../../lib/db');

function mapAmber(document) {
  if (!document) {
    return null;
  }

  return {
    id: document._id,
    code: document.code,
    senderUserId: document.senderUserId,
    recipientEmail: document.recipientEmail,
    message: document.message,
    openAt: document.openAt,
    createdBy: document.createdBy,
    createdAt: document.createdAt,
    status: document.status,
    passcodeHash: document.passcodeHash,
    archivedAt: document.archivedAt || null,
  };
}

exports.getAll = async function getAll() {
  return db
    .getCollection('ambers')
    .find({}, { sort: { createdAt: -1 } })
    .toArray()
    .then(function (documents) {
      return documents.map(mapAmber);
    });
};

exports.findById = async function findById(amberId) {
  return mapAmber(await db.getCollection('ambers').findOne({ _id: amberId }));
};

exports.findByCode = async function findByCode(code) {
  return mapAmber(
    await db.getCollection('ambers').findOne({
      code: {
        $regex: '^' + String(code).replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$',
        $options: 'i',
      },
    }),
  );
};

exports.count = async function count() {
  return db.getCollection('ambers').countDocuments();
};

exports.insert = async function insert(record) {
  await db.getCollection('ambers').insertOne({
    _id: record.id,
    code: record.code,
    senderUserId: record.senderUserId,
    recipientEmail: record.recipientEmail,
    message: record.message,
    openAt: record.openAt,
    createdBy: record.createdBy,
    createdAt: record.createdAt,
    status: record.status,
    passcodeHash: record.passcodeHash,
    archivedAt: record.archivedAt || null,
  });

  return record;
};

exports.update = async function update(updatedRecord) {
  await db.getCollection('ambers').updateOne(
    { _id: updatedRecord.id },
    {
      $set: {
        code: updatedRecord.code,
        senderUserId: updatedRecord.senderUserId,
        recipientEmail: updatedRecord.recipientEmail,
        message: updatedRecord.message,
        openAt: updatedRecord.openAt,
        createdBy: updatedRecord.createdBy,
        createdAt: updatedRecord.createdAt,
        status: updatedRecord.status,
        passcodeHash: updatedRecord.passcodeHash,
        archivedAt: updatedRecord.archivedAt || null,
      },
    },
  );

  return updatedRecord;
};
