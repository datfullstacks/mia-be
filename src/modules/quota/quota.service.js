var amberStore = require('../amber/amber.store');
var paymentStore = require('../payment/payment.store');
var paymentPlans = require('../payment/payment-plans');

var SUCCESS_PAYMENT_STATUSES = ['paid', 'approved_manual'];

function countUsedAmbers(ambers, userId) {
  return ambers.filter(function (amber) {
    return amber.senderUserId === userId;
  }).length;
}

function countPurchasedCredits(payments, userId) {
  return payments
    .filter(function (payment) {
      return payment.userId === userId && SUCCESS_PAYMENT_STATUSES.includes(payment.status);
    })
    .reduce(function (total, payment) {
      return total + paymentPlans.getAmberCreditsForAmount(payment.amount);
    }, 0);
}

exports.getQuotaForUser = async function getQuotaForUser(userId) {
  var ambers = await amberStore.getAll();
  var payments = await paymentStore.getAll();
  var usedCredits = countUsedAmbers(ambers, userId);
  var purchasedCredits = countPurchasedCredits(payments, userId);
  var freeCredits = paymentPlans.FREE_AMBER_ALLOWANCE;
  var totalCredits = freeCredits + purchasedCredits;

  return {
    freeCredits: freeCredits,
    purchasedCredits: purchasedCredits,
    totalCredits: totalCredits,
    usedCredits: usedCredits,
    remainingCredits: Math.max(totalCredits - usedCredits, 0),
  };
};

exports.attachQuotaToUser = async function attachQuotaToUser(user) {
  if (!user) {
    return null;
  }

  return Object.assign({}, user, {
    amberQuota: await exports.getQuotaForUser(user.id),
  });
};
