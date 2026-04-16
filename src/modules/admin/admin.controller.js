var amberService = require('../amber/amber.service');
var authService = require('../auth/auth.service');
var auditService = require('../audit/audit.service');
var mailService = require('../mail/mail.service');
var paymentService = require('../payment/payment.service');

function parsePositiveInteger(value, fallback) {
  var parsed = Number.parseInt(value, 10);

  if (!Number.isInteger(parsed) || parsed < 1) {
    return fallback;
  }

  return parsed;
}

exports.getAdminOverview = async function getAdminOverview(req, res, next) {
  try {
    var amberResult = await amberService.listAmberMetadata({
      includeArchived: req.query.includeArchived !== 'false',
      status: req.query.amberStatus,
      search: req.query.amberSearch,
      page: parsePositiveInteger(req.query.amberPage, 1),
      pageSize: parsePositiveInteger(req.query.amberPageSize, 5),
    });
    var paymentResult = await paymentService.listAllPayments({
      status: req.query.paymentStatus,
      search: req.query.paymentSearch,
      page: parsePositiveInteger(req.query.paymentPage, 1),
      pageSize: parsePositiveInteger(req.query.paymentPageSize, 5),
    });
    var mailResult = await mailService.listMailLogs({
      status: req.query.mailStatus,
      event: req.query.mailEvent,
      search: req.query.mailSearch,
      page: parsePositiveInteger(req.query.mailPage, 1),
      pageSize: parsePositiveInteger(req.query.mailPageSize, 5),
    });
    var actionResult = await auditService.listActionLogs({
      actionType: req.query.actionType,
      search: req.query.actionSearch,
      page: parsePositiveInteger(req.query.actionPage, 1),
      pageSize: parsePositiveInteger(req.query.actionPageSize, 5),
    });
    var stats = await Promise.all([
      authService.getUserStats(),
      amberService.getAmberStats(),
      paymentService.getPaymentStats(),
      mailService.getMailStats(),
      auditService.getActionStats(),
    ]);

    res.json({
      stats: {
        users: stats[0],
        ambers: stats[1],
        payments: stats[2],
        mail: stats[3],
        audit: stats[4],
      },
      amberMetadata: amberResult.items,
      amberPagination: amberResult.pagination,
      payments: paymentResult.items,
      paymentPagination: paymentResult.pagination,
      mailLogs: mailResult.items,
      mailPagination: mailResult.pagination,
      actionLogs: actionResult.items,
      actionPagination: actionResult.pagination,
    });
  } catch (error) {
    next(error);
  }
};

exports.approvePayment = async function approvePayment(req, res, next) {
  try {
    var paymentId = req.params.paymentId;

    if (!paymentId) {
      var missingError = new Error('paymentId is required');
      missingError.statusCode = 400;
      throw missingError;
    }

    var payment = await paymentService.approvePayment(paymentId, req.currentUser.id);
    await auditService.logAdminAction(req.currentUser, {
      actionType: 'approve_payment',
      targetType: 'payment',
      targetId: payment.id,
      summary: 'Manually approved ' + payment.paymentRef + ' and upgraded user ' + payment.userId + ' to Pro',
    });

    res.json({
      item: payment,
    });
  } catch (error) {
    next(error);
  }
};
