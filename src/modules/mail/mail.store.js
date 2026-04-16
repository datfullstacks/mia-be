var db = require('../../lib/db');

function mapMailLog(document) {
  if (!document) {
    return null;
  }

  return {
    id: document._id,
    amberId: document.amberId,
    event: document.event,
    status: document.status,
    recipientEmail: document.recipientEmail,
    subject: document.subject,
    providerMessageId: document.providerMessageId,
    createdAt: document.createdAt,
    sentAt: document.sentAt,
    errorMessage: document.errorMessage || null,
  };
}

exports.getAll = async function getAll() {
  return db
    .getCollection('mail_logs')
    .find({}, { sort: { createdAt: -1 } })
    .toArray()
    .then(function (documents) {
      return documents.map(mapMailLog);
    });
};

exports.getById = async function getById(mailLogId) {
  return mapMailLog(await db.getCollection('mail_logs').findOne({ _id: mailLogId }));
};

exports.insert = async function insert(record) {
  await db.getCollection('mail_logs').insertOne({
    _id: record.id,
    amberId: record.amberId,
    event: record.event,
    status: record.status,
    recipientEmail: record.recipientEmail,
    subject: record.subject,
    providerMessageId: record.providerMessageId,
    createdAt: record.createdAt,
    sentAt: record.sentAt,
    errorMessage: record.errorMessage || null,
  });

  return record;
};
