var app = require('../app');
var db = require('../src/lib/db');
var paymentService = require('../src/modules/payment/payment.service');

module.exports = async function handler(req, res) {
  await db.connectToDatabase();
  await paymentService.syncHistoricalPaymentRefs();
  await paymentService.reconcilePaymentsFromWebhookLogs();
  return app(req, res);
};
