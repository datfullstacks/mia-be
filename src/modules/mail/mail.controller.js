var mailService = require('./mail.service');
var auditService = require('../audit/audit.service');

exports.listMyMailLogs = async function listMyMailLogs(req, res, next) {
  try {
    var amberIds = typeof req.query.amberIds === 'string' && req.query.amberIds.trim()
      ? req.query.amberIds.split(',').map(function (value) {
          return value.trim();
        }).filter(Boolean)
      : null;

    res.json({
      items: await mailService.listMailLogsForUser(req.currentUser.id, {
        amberIds: amberIds,
      }),
    });
  } catch (error) {
    next(error);
  }
};

exports.retryMyMailLog = async function retryMyMailLog(req, res, next) {
  try {
    var mailLogId = req.params.mailLogId;

    if (!mailLogId) {
      var missingError = new Error('mailLogId is required');
      missingError.statusCode = 400;
      throw missingError;
    }

    res.json({
      item: await mailService.retryMailLogForUser(req.currentUser.id, mailLogId),
    });
  } catch (error) {
    next(error);
  }
};

exports.processReadyEmails = async function processReadyEmails(req, res, next) {
  try {
    var result = await mailService.processReadyEmails();
    await auditService.logAdminAction(req.currentUser, {
      actionType: 'process_ready_emails',
      targetType: 'mail_batch',
      targetId: null,
      summary: 'Processed ' + result.processedCount + ' ready email(s)',
    });

    res.json(result);
  } catch (error) {
    next(error);
  }
};

exports.processReadyEmailsCron = async function processReadyEmailsCron(_req, res, next) {
  try {
    var result = await mailService.processReadyEmails();

    res.json({
      ok: true,
      source: 'cron',
      processedCount: result.processedCount,
      items: result.items,
      triggeredAt: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
};

exports.retryMailLog = async function retryMailLog(req, res, next) {
  try {
    var mailLogId = req.params.mailLogId;

    if (!mailLogId) {
      var missingError = new Error('mailLogId is required');
      missingError.statusCode = 400;
      throw missingError;
    }

    var mailLog = await mailService.retryMailLog(mailLogId);
    await auditService.logAdminAction(req.currentUser, {
      actionType: 'retry_mail_log',
      targetType: 'mail_log',
      targetId: mailLog.id,
      summary: 'Retried ' + mailLog.event + ' for ' + mailLog.recipientEmail,
    });

    res.json({
      item: mailLog,
    });
  } catch (error) {
    next(error);
  }
};
