var authService = require('../modules/auth/auth.service');
var getEnv = require('../config/env');

var env = getEnv();
var CSRF_COOKIE_NAME = 'mia_csrf';

function getBearerToken(req) {
  var header = req.headers.authorization;

  if (!header || !header.startsWith('Bearer ')) {
    return null;
  }

  return header.slice(7).trim();
}

function getCookieToken(req) {
  if (!req.cookies) {
    return null;
  }

  return req.cookies[env.sessionCookieName] || null;
}

exports.attachCurrentUser = async function attachCurrentUser(req, _res, next) {
  try {
    var bearerToken = getBearerToken(req);
    var token = bearerToken || getCookieToken(req);
    req.authToken = token;
    req.authMethod = bearerToken ? 'bearer' : token ? 'cookie' : null;
    req.currentUser = token ? await authService.getUserFromToken(token) : null;
    next();
  } catch (error) {
    next(error);
  }
};

exports.requireAuth = function requireAuth(req, _res, next) {
  if (!req.currentUser) {
    var authError = new Error('Authentication required');
    authError.statusCode = 401;
    return next(authError);
  }

  return next();
};

exports.requireAdmin = function requireAdmin(req, _res, next) {
  if (!req.currentUser) {
    var authError = new Error('Authentication required');
    authError.statusCode = 401;
    return next(authError);
  }

  if (!req.currentUser.isAdmin) {
    var adminError = new Error('Admin access required');
    adminError.statusCode = 403;
    return next(adminError);
  }

  return next();
};

exports.requireCsrf = function requireCsrf(req, _res, next) {
  if (!req.currentUser) {
    var authError = new Error('Authentication required');
    authError.statusCode = 401;
    return next(authError);
  }

  if (req.authMethod === 'bearer') {
    return next();
  }

  var csrfCookie = req.cookies ? req.cookies[CSRF_COOKIE_NAME] : null;
  var csrfHeader = req.headers['x-csrf-token'];

  if (!csrfCookie || !csrfHeader || csrfCookie !== csrfHeader) {
    var csrfError = new Error('CSRF token is missing or invalid');
    csrfError.statusCode = 403;
    return next(csrfError);
  }

  return next();
};
