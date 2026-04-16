var paymentService = require('./payment.service');

function createError(message, statusCode) {
  var error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

exports.listMyPayments = async function listMyPayments(req, res, next) {
  try {
    res.json({
      items: await paymentService.listPaymentsForUser(req.currentUser.id),
    });
  } catch (error) {
    next(error);
  }
};

exports.listPaymentPlans = function listPaymentPlans(_req, res, next) {
  try {
    res.json({
      items: paymentService.getPaymentPlans(),
    });
  } catch (error) {
    next(error);
  }
};

exports.getMyPayment = async function getMyPayment(req, res, next) {
  try {
    var paymentId = req.params.paymentId;

    if (!paymentId) {
      throw createError('paymentId is required', 400);
    }

    res.json({
      item: await paymentService.getPaymentForUser(req.currentUser.id, paymentId),
    });
  } catch (error) {
    next(error);
  }
};

exports.createPaymentRequest = async function createPaymentRequest(req, res, next) {
  try {
    var note = req.body.note;
    var planId = req.body.planId;

    var payment = await paymentService.createPaymentRequest(req.currentUser, {
      note: typeof note === 'string' ? note.trim() : '',
      planId: typeof planId === 'string' ? planId.trim() : '',
    });

    res.status(201).json({
      item: payment,
    });
  } catch (error) {
    next(error);
  }
};

exports.handleSePayWebhook = async function handleSePayWebhook(req, res, next) {
  try {
    var result = await paymentService.handleSePayWebhook({
      payload: req.body,
      authorizationHeader: req.get('Authorization') || '',
      secretKeyHeader: req.get('X-Secret-Key') || '',
    });

    res.json({
      success: true,
      result: result,
    });
  } catch (error) {
    next(error);
  }
};
