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

exports.createPaymentRequest = async function createPaymentRequest(req, res, next) {
  try {
    var amount = Number(req.body.amount);
    var note = req.body.note;

    if (!Number.isFinite(amount) || amount <= 0) {
      throw createError('amount must be a positive number', 400);
    }

    var payment = await paymentService.createPaymentRequest(req.currentUser, {
      amount: amount,
      note: typeof note === 'string' ? note.trim() : '',
    });

    res.status(201).json({
      item: payment,
    });
  } catch (error) {
    next(error);
  }
};
