var getEnv = require('../config/env');

var env = getEnv();

exports.requireCronSecret = function requireCronSecret(req, _res, next) {
  if (!env.cronSecret) {
    var configError = new Error('CRON_SECRET is not configured');
    configError.statusCode = 503;
    return next(configError);
  }

  var authorization = req.headers.authorization || '';
  var token = authorization.startsWith('Bearer ') ? authorization.slice(7).trim() : '';

  if (!token || token !== env.cronSecret) {
    var authError = new Error('Invalid cron secret');
    authError.statusCode = 401;
    return next(authError);
  }

  return next();
};
