var db = require('../../lib/db');

function mapUser(document) {
  if (!document) {
    return null;
  }

  return {
    id: document._id,
    name: document.name,
    email: document.email,
    passwordHash: document.passwordHash,
    tier: document.tier,
    isAdmin: Boolean(document.isAdmin),
    createdAt: document.createdAt,
  };
}

function mapSession(document) {
  if (!document) {
    return null;
  }

  return {
    token: document._id,
    userId: document.userId,
    createdAt: document.createdAt,
  };
}

exports.getUsers = async function getUsers() {
  return db
    .getCollection('users')
    .find({}, { sort: { createdAt: -1 } })
    .toArray()
    .then(function (documents) {
      return documents.map(mapUser);
    });
};

exports.findUserByEmail = async function findUserByEmail(email) {
  return mapUser(await db.getCollection('users').findOne({ email: email }));
};

exports.findUserById = async function findUserById(userId) {
  return mapUser(await db.getCollection('users').findOne({ _id: userId }));
};

exports.findSessionByToken = async function findSessionByToken(token) {
  return mapSession(await db.getCollection('sessions').findOne({ _id: token }));
};

exports.insertUser = async function insertUser(user) {
  await db.getCollection('users').insertOne({
    _id: user.id,
    name: user.name,
    email: user.email,
    passwordHash: user.passwordHash,
    tier: user.tier,
    isAdmin: user.isAdmin,
    createdAt: user.createdAt,
  });

  return user;
};

exports.insertSession = async function insertSession(session) {
  await db.getCollection('sessions').insertOne({
    _id: session.token,
    userId: session.userId,
    createdAt: session.createdAt,
  });

  return session;
};

exports.updateUserTier = async function updateUserTier(userId, nextTier) {
  await db.getCollection('users').updateOne(
    { _id: userId },
    {
      $set: {
        tier: nextTier,
      },
    },
  );
};

exports.deleteSession = async function deleteSession(token) {
  await db.getCollection('sessions').deleteOne({ _id: token });
};
