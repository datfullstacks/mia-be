var express = require('express');

var authMiddleware = require('../middleware/auth');
var cronMiddleware = require('../middleware/cron');
var authController = require('../modules/auth/auth.controller');
var healthController = require('../modules/health/health.controller');
var overviewController = require('../modules/overview/overview.controller');
var amberController = require('../modules/amber/amber.controller');
var unsealController = require('../modules/unseal/unseal.controller');
var paymentController = require('../modules/payment/payment.controller');
var adminController = require('../modules/admin/admin.controller');
var mailController = require('../modules/mail/mail.controller');

var router = express.Router();

router.get('/health', healthController.getHealth);
router.get('/overview', overviewController.getOverview);
router.get('/payment-plans', paymentController.listPaymentPlans);
router.post('/auth/register', authController.register);
router.post('/auth/login', authController.login);
router.get('/cron/ready-emails', cronMiddleware.requireCronSecret, mailController.processReadyEmailsCron);
router.post('/webhooks/sepay', paymentController.handleSePayWebhook);
router.get('/auth/me', authMiddleware.requireAuth, authController.getMe);
router.post('/auth/logout', authMiddleware.requireAuth, authMiddleware.requireCsrf, authController.logout);
router.get('/ambers', authMiddleware.requireAuth, amberController.listAmbers);
router.post('/ambers', authMiddleware.requireAuth, authMiddleware.requireCsrf, amberController.createAmber);
router.patch('/ambers/:amberId', authMiddleware.requireAuth, authMiddleware.requireCsrf, amberController.updateAmber);
router.post('/ambers/:amberId/cancel', authMiddleware.requireAuth, authMiddleware.requireCsrf, amberController.cancelAmber);
router.post('/ambers/:amberId/archive', authMiddleware.requireAuth, authMiddleware.requireCsrf, amberController.archiveAmber);
router.post('/unseal', unsealController.unsealAmber);
router.get('/mail-logs', authMiddleware.requireAuth, mailController.listMyMailLogs);
router.post('/mail-logs/:mailLogId/retry', authMiddleware.requireAuth, authMiddleware.requireCsrf, mailController.retryMyMailLog);
router.get('/payments', authMiddleware.requireAuth, paymentController.listMyPayments);
router.get('/payments/:paymentId', authMiddleware.requireAuth, paymentController.getMyPayment);
router.post('/payments', authMiddleware.requireAuth, authMiddleware.requireCsrf, paymentController.createPaymentRequest);
router.get('/admin/overview', authMiddleware.requireAdmin, adminController.getAdminOverview);
router.post(
  '/admin/mail-logs/process-ready',
  authMiddleware.requireAdmin,
  authMiddleware.requireCsrf,
  mailController.processReadyEmails,
);
router.post(
  '/admin/mail-logs/:mailLogId/retry',
  authMiddleware.requireAdmin,
  authMiddleware.requireCsrf,
  mailController.retryMailLog,
);
router.post(
  '/admin/payments/:paymentId/approve',
  authMiddleware.requireAdmin,
  authMiddleware.requireCsrf,
  adminController.approvePayment,
);

module.exports = router;
