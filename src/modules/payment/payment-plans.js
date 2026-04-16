var FREE_AMBER_ALLOWANCE = 3;

var PAYMENT_PLANS = [
  {
    id: 'amber-10',
    amount: 10000,
    amberCredits: 10,
    label: '10k / 10 amber',
  },
  {
    id: 'amber-23',
    amount: 20000,
    amberCredits: 23,
    label: '20k / 23 amber',
  },
  {
    id: 'amber-35',
    amount: 30000,
    amberCredits: 35,
    label: '30k / 35 amber',
  },
];

exports.FREE_AMBER_ALLOWANCE = FREE_AMBER_ALLOWANCE;
exports.PAYMENT_PLANS = PAYMENT_PLANS;

exports.getPaymentPlans = function getPaymentPlans() {
  return PAYMENT_PLANS.map(function (plan) {
    return {
      id: plan.id,
      amount: plan.amount,
      amberCredits: plan.amberCredits,
      label: plan.label,
    };
  });
};

exports.findPaymentPlanById = function findPaymentPlanById(planId) {
  return PAYMENT_PLANS.find(function (plan) {
    return plan.id === planId;
  }) || null;
};

exports.findPaymentPlanByAmount = function findPaymentPlanByAmount(amount) {
  return PAYMENT_PLANS.find(function (plan) {
    return plan.amount === amount;
  }) || null;
};

exports.getAmberCreditsForAmount = function getAmberCreditsForAmount(amount) {
  var plan = exports.findPaymentPlanByAmount(amount);
  return plan ? plan.amberCredits : 0;
};
