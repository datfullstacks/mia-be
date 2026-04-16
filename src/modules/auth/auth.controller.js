var authService = require('./auth.service');
var getEnv = require('../../config/env');
var security = require('../../lib/security');

var env = getEnv();
var CSRF_COOKIE_NAME = 'mia_csrf';

function createError(message, statusCode) {
  var error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function getCookieOptions(httpOnly) {
  return {
    httpOnly: httpOnly,
    sameSite: env.sessionCookieSameSite,
    secure: env.sessionCookieSecure,
    path: '/',
    maxAge: 30 * 24 * 60 * 60 * 1000,
  };
}

function setSessionCookie(res, token) {
  res.cookie(env.sessionCookieName, token, getCookieOptions(true));
}

function clearSessionCookie(res) {
  res.clearCookie(env.sessionCookieName, {
    httpOnly: true,
    sameSite: env.sessionCookieSameSite,
    secure: env.sessionCookieSecure,
    path: '/',
  });
}

function setCsrfCookie(res, csrfToken) {
  res.cookie(CSRF_COOKIE_NAME, csrfToken, getCookieOptions(false));
}

function clearCsrfCookie(res) {
  res.clearCookie(CSRF_COOKIE_NAME, {
    httpOnly: false,
    sameSite: env.sessionCookieSameSite,
    secure: env.sessionCookieSecure,
    path: '/',
  });
}

function ensureCsrfToken(req, res) {
  var csrfToken = req.cookies && req.cookies[CSRF_COOKIE_NAME]
    ? req.cookies[CSRF_COOKIE_NAME]
    : security.createToken();

  setCsrfCookie(res, csrfToken);
  return csrfToken;
}

exports.register = async function register(req, res, next) {
  try {
    var name = req.body.name;
    var email = req.body.email;
    var password = req.body.password;

    if (!name || typeof name !== 'string' || name.trim().length < 2) {
      throw createError('name must be at least 2 characters', 400);
    }

    if (!email || typeof email !== 'string' || !email.includes('@')) {
      throw createError('email must be valid', 400);
    }

    if (!password || typeof password !== 'string' || password.length < 6) {
      throw createError('password must be at least 6 characters', 400);
    }

    var result = await authService.register({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      password: password,
    });

    setSessionCookie(res, result.token);
    res.status(201).json({
      token: result.token,
      user: result.user,
      csrfToken: ensureCsrfToken(req, res),
    });
  } catch (error) {
    next(error);
  }
};

exports.login = async function login(req, res, next) {
  try {
    var email = req.body.email;
    var password = req.body.password;

    if (!email || typeof email !== 'string' || !email.includes('@')) {
      throw createError('email must be valid', 400);
    }

    if (!password || typeof password !== 'string') {
      throw createError('password is required', 400);
    }

    var result = await authService.login({
      email: email.trim().toLowerCase(),
      password: password,
    });

    setSessionCookie(res, result.token);
    res.json({
      token: result.token,
      user: result.user,
      csrfToken: ensureCsrfToken(req, res),
    });
  } catch (error) {
    next(error);
  }
};

exports.getMe = function getMe(req, res, next) {
  try {
    if (!req.currentUser) {
      throw createError('Authentication required', 401);
    }

    res.json({
      user: req.currentUser,
      csrfToken: ensureCsrfToken(req, res),
    });
  } catch (error) {
    next(error);
  }
};

exports.logout = async function logout(req, res, next) {
  try {
    if (!req.authToken) {
      throw createError('Authentication required', 401);
    }

    await authService.logout(req.authToken);
    clearSessionCookie(res);
    clearCsrfCookie(res);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
};
