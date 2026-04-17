var crypto = require('crypto');
var authStore = require('./auth.store');
var security = require('../../lib/security');
var timeRange = require('../../lib/time-range');

function sanitizeUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    tier: user.tier,
    isAdmin: user.isAdmin,
    createdAt: user.createdAt,
  };
}

exports.register = async function register(payload) {
  if (await authStore.findUserByEmail(payload.email)) {
    var duplicateError = new Error('Email is already registered');
    duplicateError.statusCode = 409;
    throw duplicateError;
  }

  var user = await authStore.insertUser({
    id: crypto.randomUUID(),
    name: payload.name,
    email: payload.email,
    passwordHash: security.hashSecret(payload.password),
    tier: 'free',
    isAdmin: false,
    createdAt: new Date().toISOString(),
  });

  var session = await authStore.insertSession({
    token: security.createToken(),
    userId: user.id,
    createdAt: new Date().toISOString(),
  });

  return {
    token: session.token,
    user: sanitizeUser(user),
  };
};

exports.login = async function login(payload) {
  var user = await authStore.findUserByEmail(payload.email);

  if (!user || !security.compareSecret(payload.password, user.passwordHash)) {
    var authError = new Error('Invalid email or password');
    authError.statusCode = 401;
    throw authError;
  }

  var session = await authStore.insertSession({
    token: security.createToken(),
    userId: user.id,
    createdAt: new Date().toISOString(),
  });

  return {
    token: session.token,
    user: sanitizeUser(user),
  };
};

exports.getUserFromToken = async function getUserFromToken(token) {
  var session = await authStore.findSessionByToken(token);

  if (!session) {
    return null;
  }

  var user = await authStore.findUserById(session.userId);
  return user ? sanitizeUser(user) : null;
};

exports.getUserRecordById = async function getUserRecordById(userId) {
  return (await authStore.findUserById(userId)) || null;
};

exports.updateUserTier = async function updateUserTier(userId, nextTier) {
  var user = await authStore.findUserById(userId);

  if (!user) {
    return null;
  }

  await authStore.updateUserTier(userId, nextTier);

  return sanitizeUser({
    id: user.id,
    name: user.name,
    email: user.email,
    passwordHash: user.passwordHash,
    tier: nextTier,
    isAdmin: user.isAdmin,
    createdAt: user.createdAt,
  });
};

exports.logout = async function logout(token) {
  await authStore.deleteSession(token);
};

exports.getUserStats = async function getUserStats(options) {
  var range = timeRange.resolveRange(options && options.period);
  var users = (await authStore.getUsers()).filter(function (user) {
    return timeRange.isWithinRange(user.createdAt, range);
  });

  return {
    totalUsers: users.length,
    proUsers: users.filter(function (user) {
      return user.tier === 'pro';
    }).length,
  };
};
