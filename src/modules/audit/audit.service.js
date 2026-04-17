var crypto = require('crypto');
var auditStore = require('./audit.store');
var pagination = require('../../lib/pagination');
var timeRange = require('../../lib/time-range');

function filterActionLogs(logs, options) {
  var actionType = options && options.actionType ? String(options.actionType).toLowerCase() : 'all';
  var searchTerm = options && options.search ? String(options.search).trim().toLowerCase() : '';

  return logs
    .filter(function (log) {
      if (actionType !== 'all' && log.actionType !== actionType) {
        return false;
      }

      if (!searchTerm) {
        return true;
      }

      return [log.adminName, log.adminEmail, log.actionType, log.targetType, log.targetId, log.summary].some(
        function (value) {
          return String(value || '')
            .toLowerCase()
            .includes(searchTerm);
        },
      );
    })
    .sort(function (left, right) {
      return new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime();
    });
}

exports.logAdminAction = async function logAdminAction(adminUser, payload) {
  return auditStore.insert({
    id: crypto.randomUUID(),
    adminUserId: adminUser.id,
    adminName: adminUser.name,
    adminEmail: adminUser.email,
    actionType: payload.actionType,
    targetType: payload.targetType,
    targetId: payload.targetId || null,
    summary: payload.summary,
    createdAt: new Date().toISOString(),
  });
};

exports.listActionLogs = async function listActionLogs(options) {
  var items = filterActionLogs(await auditStore.getAll(), options);
  var paging = pagination.getPaginationOptions(options, {
    page: 1,
    pageSize: 5,
    maxPageSize: 20,
  });

  return pagination.paginateItems(items, paging);
};

exports.getActionStats = async function getActionStats(options) {
  var range = timeRange.resolveRange(options && options.period);
  var logs = (await auditStore.getAll()).filter(function (log) {
    return timeRange.isWithinRange(log.createdAt, range);
  });

  return {
    totalActionLogs: logs.length,
  };
};
