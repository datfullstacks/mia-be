var crypto = require('crypto');
var amberStore = require('./amber.store');
var mailService = require('../mail/mail.service');
var pagination = require('../../lib/pagination');
var quotaService = require('../quota/quota.service');
var security = require('../../lib/security');

function getComputedStatus(amber) {
  if (amber.status === 'cancelled' || amber.status === 'opened') {
    return amber.status;
  }

  if (new Date(amber.openAt).getTime() <= Date.now()) {
    return 'ready';
  }

  return 'scheduled';
}

function isFutureTimestamp(value) {
  return new Date(value).getTime() > Date.now();
}

function isSelfFutureAmber(payload) {
  return (
    Boolean(payload.senderEmail) &&
    String(payload.recipientEmail || '').toLowerCase() === String(payload.senderEmail || '').toLowerCase() &&
    isFutureTimestamp(payload.openAt)
  );
}

function matchesSearch(amber, searchTerm) {
  if (!searchTerm) {
    return true;
  }

  return [amber.code, amber.recipientEmail, amber.createdBy, amber.message].some(function (value) {
    return String(value || '')
      .toLowerCase()
      .includes(searchTerm);
  });
}

function mapAmber(amber) {
  return {
    id: amber.id,
    code: amber.code,
    recipientEmail: amber.recipientEmail,
    message: amber.message,
    openAt: amber.openAt,
    createdBy: amber.createdBy,
    createdAt: amber.createdAt,
    status: getComputedStatus(amber),
    archivedAt: amber.archivedAt || null,
  };
}

async function getOwnedAmber(userId, amberId) {
  var amber = await amberStore.findById(amberId);

  if (!amber || amber.senderUserId !== userId) {
    var notFoundError = new Error('Amber not found');
    notFoundError.statusCode = 404;
    throw notFoundError;
  }

  return amber;
}

async function getOwnedAmberForUpdate(userId, amberId) {
  var amber = await getOwnedAmber(userId, amberId);

  if (getComputedStatus(amber) !== 'scheduled') {
    var immutableError = new Error('Amber can only be changed before it opens');
    immutableError.statusCode = 409;
    throw immutableError;
  }

  return amber;
}

exports.listAmbersForUser = async function listAmbersForUser(userId, options) {
  var includeArchived = Boolean(options && options.includeArchived);
  var statusFilter = options && options.status ? String(options.status).toLowerCase() : 'all';
  var searchTerm = options && options.search ? String(options.search).trim().toLowerCase() : '';
  var paging = pagination.getPaginationOptions(options, {
    page: 1,
    pageSize: 4,
    maxPageSize: 12,
  });
  var items = (await amberStore.getAll())
    .filter(function (amber) {
      if (amber.senderUserId !== userId) {
        return false;
      }

      if (!includeArchived && amber.archivedAt) {
        return false;
      }

      return true;
    })
    .map(mapAmber)
    .filter(function (amber) {
      if (statusFilter !== 'all' && amber.status !== statusFilter) {
        return false;
      }

      return matchesSearch(amber, searchTerm);
    })
    .sort(function (left, right) {
      return new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime();
    });

  return pagination.paginateItems(items, paging);
};

exports.createAmber = async function createAmber(payload) {
  var allowsSelfFutureAmber = isSelfFutureAmber(payload);

  if (!payload.isAdmin && !allowsSelfFutureAmber) {
    var quota = await quotaService.getQuotaForUser(payload.senderUserId);

    if (quota.remainingCredits < 1) {
      var quotaError = new Error('No amber remaining. Buy another package to keep sealing.');
      quotaError.statusCode = 409;
      throw quotaError;
    }
  }

  var nextNumber = (await amberStore.count()) + 1;
  var record = {
    id: crypto.randomUUID(),
    code: 'MIA-' + String(nextNumber).padStart(6, '0'),
    senderUserId: payload.senderUserId,
    recipientEmail: payload.recipientEmail,
    message: payload.message,
    openAt: payload.openAt,
    createdBy: payload.createdBy,
    createdAt: new Date().toISOString(),
    status: 'scheduled',
    passcodeHash: security.hashSecret(payload.passcode),
    archivedAt: null,
  };
  var createdAmber = await amberStore.insert(record);
  await mailService.logAmberCreated(createdAmber, payload.passcode);
  return mapAmber(createdAmber);
};

exports.updateAmberForUser = async function updateAmberForUser(userId, amberId, payload) {
  var amber = await getOwnedAmberForUpdate(userId, amberId);

  var updatedRecord = await amberStore.update({
    id: amber.id,
    code: amber.code,
    senderUserId: amber.senderUserId,
    recipientEmail: payload.recipientEmail,
    message: payload.message,
    openAt: payload.openAt,
    createdBy: amber.createdBy,
    createdAt: amber.createdAt,
    status: amber.status,
    passcodeHash: payload.passcode ? security.hashSecret(payload.passcode) : amber.passcodeHash,
    archivedAt: amber.archivedAt,
  });

  return mapAmber(updatedRecord);
};

exports.cancelAmberForUser = async function cancelAmberForUser(userId, amberId) {
  var amber = await getOwnedAmberForUpdate(userId, amberId);
  var updatedRecord = await amberStore.update({
    id: amber.id,
    code: amber.code,
    senderUserId: amber.senderUserId,
    recipientEmail: amber.recipientEmail,
    message: amber.message,
    openAt: amber.openAt,
    createdBy: amber.createdBy,
    createdAt: amber.createdAt,
    status: 'cancelled',
    passcodeHash: amber.passcodeHash,
    archivedAt: amber.archivedAt,
  });

  return mapAmber(updatedRecord);
};

exports.archiveAmberForUser = async function archiveAmberForUser(userId, amberId) {
  var amber = await getOwnedAmber(userId, amberId);
  var status = getComputedStatus(amber);

  if (amber.archivedAt) {
    var archivedError = new Error('Amber is already archived');
    archivedError.statusCode = 409;
    throw archivedError;
  }

  if (status !== 'opened' && status !== 'cancelled') {
    var immutableError = new Error('Only opened or cancelled ambers can be archived');
    immutableError.statusCode = 409;
    throw immutableError;
  }

  var updatedRecord = await amberStore.update({
    id: amber.id,
    code: amber.code,
    senderUserId: amber.senderUserId,
    recipientEmail: amber.recipientEmail,
    message: amber.message,
    openAt: amber.openAt,
    createdBy: amber.createdBy,
    createdAt: amber.createdAt,
    status: amber.status,
    passcodeHash: amber.passcodeHash,
    archivedAt: new Date().toISOString(),
  });

  return mapAmber(updatedRecord);
};

exports.getAmberStats = async function getAmberStats() {
  var ambers = (await amberStore.getAll()).map(mapAmber);

  return {
    totalAmbers: ambers.length,
    scheduledCount: ambers.filter(function (amber) {
      return amber.status === 'scheduled';
    }).length,
    readyCount: ambers.filter(function (amber) {
      return amber.status === 'ready';
    }).length,
  };
};

exports.listAmberMetadata = async function listAmberMetadata(options) {
  var statusFilter = options && options.status ? String(options.status).toLowerCase() : 'all';
  var searchTerm = options && options.search ? String(options.search).trim().toLowerCase() : '';
  var includeArchived = options && options.includeArchived !== undefined ? Boolean(options.includeArchived) : true;
  var paging = pagination.getPaginationOptions(options, {
    page: 1,
    pageSize: 5,
    maxPageSize: 20,
  });
  var items = (await amberStore.getAll())
    .map(function (amber) {
      return {
        id: amber.id,
        code: amber.code,
        recipientEmail: amber.recipientEmail,
        openAt: amber.openAt,
        createdBy: amber.createdBy,
        createdAt: amber.createdAt,
        status: getComputedStatus(amber),
        message: '***',
        archivedAt: amber.archivedAt || null,
      };
    })
    .filter(function (amber) {
      if (!includeArchived && amber.archivedAt) {
        return false;
      }

      if (statusFilter !== 'all' && amber.status !== statusFilter) {
        return false;
      }

      if (!searchTerm) {
        return true;
      }

      return [amber.code, amber.recipientEmail, amber.createdBy].some(function (value) {
        return String(value || '')
          .toLowerCase()
          .includes(searchTerm);
      });
    })
    .sort(function (left, right) {
      return new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime();
    });

  return pagination.paginateItems(items, paging);
};

exports.unsealAmber = async function unsealAmber(payload) {
  var amber = await amberStore.findByCode(payload.code);

  if (!amber || amber.code.toLowerCase() !== payload.code.toLowerCase()) {
    var notFoundError = new Error('Amber not found');
    notFoundError.statusCode = 404;
    throw notFoundError;
  }

  if (!security.compareSecret(payload.passcode, amber.passcodeHash)) {
    var invalidError = new Error('Invalid passcode');
    invalidError.statusCode = 401;
    throw invalidError;
  }

  var status = getComputedStatus(amber);
  if (status === 'cancelled') {
    var cancelledError = new Error('Amber was cancelled and cannot be opened');
    cancelledError.statusCode = 409;
    throw cancelledError;
  }

  if (status === 'scheduled') {
    return {
      state: 'not_ready',
      code: amber.code,
      recipientEmail: amber.recipientEmail,
      openAt: amber.openAt,
    };
  }

  if (status !== 'opened') {
    await amberStore.update({
      id: amber.id,
      code: amber.code,
      senderUserId: amber.senderUserId,
      recipientEmail: amber.recipientEmail,
      message: amber.message,
      openAt: amber.openAt,
      createdBy: amber.createdBy,
      createdAt: amber.createdAt,
      status: 'opened',
      passcodeHash: amber.passcodeHash,
      archivedAt: amber.archivedAt,
    });
  }

  return {
    state: 'opened',
    code: amber.code,
    recipientEmail: amber.recipientEmail,
    openAt: amber.openAt,
    message: amber.message,
  };
};
