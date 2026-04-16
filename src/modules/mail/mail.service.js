var crypto = require('crypto');
var getEnv = require('../../config/env');
var mailStore = require('./mail.store');
var mailProvider = require('./mail.provider');
var amberStore = require('../amber/amber.store');
var pagination = require('../../lib/pagination');

var env = getEnv();

function mapMailLog(record) {
  return {
    id: record.id,
    amberId: record.amberId,
    event: record.event,
    status: record.status,
    recipientEmail: record.recipientEmail,
    subject: record.subject,
    providerMessageId: record.providerMessageId,
    createdAt: record.createdAt,
    sentAt: record.sentAt,
    errorMessage: record.errorMessage || null,
  };
}

function buildMessage(amber, event) {
  var actionUrl = env.appBaseUrl.replace(/\/$/, '') + '/room?app=unseal';
  var title = event === 'amber_ready' ? 'Your amber is ready to open' : 'A new amber has been sealed for you';
  var body =
    event === 'amber_ready'
      ? 'The waiting period is over. Visit MIA and enter the amber code below.'
      : 'Someone sealed a message in MIA for you. Keep the code below and return when it is time.';

  return {
    subject:
      event === 'amber_ready'
        ? 'MIA amber ' + amber.code + ' is ready to open'
        : 'MIA amber ' + amber.code + ' was sealed',
    text:
      title +
      '\n\n' +
      body +
      '\n\nCode: ' +
      amber.code +
      '\nOpen at: ' +
      amber.openAt +
      '\nUnseal: ' +
      actionUrl,
    html:
      '<h2>' +
      title +
      '</h2>' +
      '<p>' +
      body +
      '</p>' +
      '<p><strong>Code:</strong> ' +
      amber.code +
      '</p>' +
      '<p><strong>Open at:</strong> ' +
      amber.openAt +
      '</p>' +
      '<p><a href="' +
      actionUrl +
      '">Open MIA</a></p>',
  };
}

async function createMailLog(payload) {
  var now = new Date().toISOString();
  var delivery = await mailProvider.sendMail({
    to: payload.recipientEmail,
    subject: payload.subject,
    html: payload.html,
    text: payload.text,
    idempotencyKey: payload.idempotencyKey || payload.event + ':' + payload.amberId,
  });

  return mailStore.insert({
    id: crypto.randomUUID(),
    amberId: payload.amberId,
    event: payload.event,
    status: delivery.status,
    recipientEmail: payload.recipientEmail,
    subject: payload.subject,
    providerMessageId: delivery.providerMessageId,
    createdAt: now,
    sentAt: now,
    errorMessage: delivery.errorMessage,
  });
}

async function getOwnedAmberIds(userId) {
  return (await amberStore.getAll())
    .filter(function (amber) {
      return amber.senderUserId === userId;
    })
    .map(function (amber) {
      return amber.id;
    });
}

function filterMailLogs(logs, options) {
  var statusFilter = options && options.status ? String(options.status).toLowerCase() : 'all';
  var eventFilter = options && options.event ? String(options.event).toLowerCase() : 'all';
  var searchTerm = options && options.search ? String(options.search).trim().toLowerCase() : '';
  var amberIds = options && Array.isArray(options.amberIds) ? options.amberIds : null;

  return logs
    .filter(function (log) {
      if (amberIds && amberIds.length > 0 && !amberIds.includes(log.amberId)) {
        return false;
      }

      if (statusFilter !== 'all' && log.status !== statusFilter) {
        return false;
      }

      if (eventFilter !== 'all' && log.event !== eventFilter) {
        return false;
      }

      if (!searchTerm) {
        return true;
      }

      return [log.recipientEmail, log.subject, log.event].some(function (value) {
        return String(value || '')
          .toLowerCase()
          .includes(searchTerm);
      });
    })
    .sort(function (left, right) {
      return new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime();
    });
}

exports.logAmberCreated = async function logAmberCreated(amber) {
  var message = buildMessage(amber, 'amber_created');

  return mapMailLog(
    await createMailLog({
      amberId: amber.id,
      event: 'amber_created',
      recipientEmail: amber.recipientEmail,
      subject: message.subject,
      html: message.html,
      text: message.text,
    }),
  );
};

exports.processReadyEmails = async function processReadyEmails() {
  var logs = await mailStore.getAll();
  var ambers = await amberStore.getAll();
  var nowMs = Date.now();
  var processed = [];

  ambers.forEach(function (amber) {
    if (amber.status === 'cancelled' || amber.status === 'opened') {
      return;
    }

    if (new Date(amber.openAt).getTime() > nowMs) {
      return;
    }

    var alreadySent = logs.some(function (log) {
      return log.amberId === amber.id && log.event === 'amber_ready' && log.status === 'sent';
    });

    if (alreadySent) {
      return;
    }

    processed.push(amber);
  });

  var processedLogs = [];

  for (var index = 0; index < processed.length; index += 1) {
    var amber = processed[index];
    var message = buildMessage(amber, 'amber_ready');

    processedLogs.push(
      mapMailLog(
        await createMailLog({
          amberId: amber.id,
          event: 'amber_ready',
          recipientEmail: amber.recipientEmail,
          subject: message.subject,
          html: message.html,
          text: message.text,
        }),
      ),
    );
  }

  return {
    processedCount: processedLogs.length,
    items: processedLogs,
  };
};

exports.retryMailLog = async function retryMailLog(mailLogId) {
  var mailLog = await mailStore.getById(mailLogId);

  if (!mailLog) {
    var notFoundError = new Error('Mail log not found');
    notFoundError.statusCode = 404;
    throw notFoundError;
  }

  if (mailLog.status === 'sent') {
    var sentError = new Error('Only failed mail logs can be retried');
    sentError.statusCode = 409;
    throw sentError;
  }

  var amber = await amberStore.findById(mailLog.amberId);

  if (!amber) {
    var amberMissingError = new Error('Amber for this mail log no longer exists');
    amberMissingError.statusCode = 404;
    throw amberMissingError;
  }

  var sentSibling = (await mailStore.getAll()).some(function (log) {
    return (
      log.id !== mailLog.id &&
      log.amberId === mailLog.amberId &&
      log.event === mailLog.event &&
      log.status === 'sent'
    );
  });

  if (sentSibling) {
    var duplicateError = new Error('A successful mail log already exists for this event');
    duplicateError.statusCode = 409;
    throw duplicateError;
  }

  var message = buildMessage(amber, mailLog.event);

  return mapMailLog(
    await createMailLog({
      amberId: amber.id,
      event: mailLog.event,
      recipientEmail: amber.recipientEmail,
      subject: message.subject,
      html: message.html,
      text: message.text,
      idempotencyKey: mailLog.event + ':' + amber.id + ':retry:' + crypto.randomUUID(),
    }),
  );
};

exports.listMailLogs = async function listMailLogs(options) {
  var items = filterMailLogs((await mailStore.getAll()).map(mapMailLog), options);
  var paging = pagination.getPaginationOptions(options, {
    page: 1,
    pageSize: 5,
    maxPageSize: 20,
  });

  return pagination.paginateItems(items, paging);
};

exports.listMailLogsForUser = async function listMailLogsForUser(userId, options) {
  var ownedAmberIds = await getOwnedAmberIds(userId);
  var scopedAmberIds = options && Array.isArray(options.amberIds) ? options.amberIds : ownedAmberIds;

  return filterMailLogs(
    (await mailStore.getAll())
      .filter(function (log) {
        return ownedAmberIds.includes(log.amberId);
      })
      .map(mapMailLog),
    {
      amberIds: scopedAmberIds,
      status: options && options.status,
      event: options && options.event,
      search: options && options.search,
    },
  );
};

exports.retryMailLogForUser = async function retryMailLogForUser(userId, mailLogId) {
  var mailLog = await mailStore.getById(mailLogId);

  if (!mailLog) {
    var notFoundError = new Error('Mail log not found');
    notFoundError.statusCode = 404;
    throw notFoundError;
  }

  if (!(await getOwnedAmberIds(userId)).includes(mailLog.amberId)) {
    var forbiddenError = new Error('You do not have access to this mail log');
    forbiddenError.statusCode = 403;
    throw forbiddenError;
  }

  return exports.retryMailLog(mailLogId);
};

exports.getMailStats = async function getMailStats() {
  var logs = await mailStore.getAll();

  return {
    totalLogs: logs.length,
    sentLogs: logs.filter(function (log) {
      return log.status === 'sent';
    }).length,
    failedLogs: logs.filter(function (log) {
      return log.status === 'failed';
    }).length,
    readyEmails: logs.filter(function (log) {
      return log.event === 'amber_ready';
    }).length,
  };
};
