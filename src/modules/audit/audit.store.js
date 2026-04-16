var db = require('../../lib/db');

function mapAuditLog(document) {
  if (!document) {
    return null;
  }

  return {
    id: document._id,
    adminUserId: document.adminUserId,
    adminName: document.adminName,
    adminEmail: document.adminEmail,
    actionType: document.actionType,
    targetType: document.targetType,
    targetId: document.targetId || null,
    summary: document.summary,
    createdAt: document.createdAt,
  };
}

exports.getAll = async function getAll() {
  return db
    .getCollection('admin_action_logs')
    .find({}, { sort: { createdAt: -1 } })
    .toArray()
    .then(function (documents) {
      return documents.map(mapAuditLog);
    });
};

exports.insert = async function insert(record) {
  await db.getCollection('admin_action_logs').insertOne({
    _id: record.id,
    adminUserId: record.adminUserId,
    adminName: record.adminName,
    adminEmail: record.adminEmail,
    actionType: record.actionType,
    targetType: record.targetType,
    targetId: record.targetId || null,
    summary: record.summary,
    createdAt: record.createdAt,
  });

  return record;
};
