var MongoClient = require('mongodb').MongoClient;

var getEnv = require('../config/env');
var security = require('./security');

var env = getEnv();
var client = null;
var database = null;
var connectPromise = null;

function getDatabaseName() {
  if (env.mongoDbName) {
    return env.mongoDbName;
  }

  return undefined;
}

async function ensureIndexes() {
  await Promise.all([
    database.collection('users').createIndex({ email: 1 }, { unique: true }),
    database.collection('ambers').createIndex({ code: 1 }, { unique: true }),
    database.collection('payments').createIndex({ paymentRef: 1 }, { unique: true }),
    database.collection('payments').createIndex({ userId: 1, createdAt: -1 }),
    database.collection('payments').createIndex({ status: 1, createdAt: -1 }),
    database.collection('mail_logs').createIndex({ amberId: 1, event: 1 }),
    database.collection('admin_action_logs').createIndex({ actionType: 1, createdAt: -1 }),
    database.collection('payment_webhook_logs').createIndex({ paymentRef: 1, receivedAt: -1 }),
  ]);
}

async function seedUsers() {
  if ((await database.collection('users').countDocuments()) > 0) {
    return;
  }

  await database.collection('users').insertMany([
    {
      _id: 'user-admin',
      name: 'Admin',
      email: 'admin@mia.local',
      passwordHash: security.hashSecret('admin123'),
      tier: 'pro',
      isAdmin: true,
      createdAt: '2026-04-16T01:00:00.000Z',
    },
    {
      _id: 'user-dat',
      name: 'Dat',
      email: 'dat@mia.local',
      passwordHash: security.hashSecret('dat12345'),
      tier: 'free',
      isAdmin: false,
      createdAt: '2026-04-16T01:00:00.000Z',
    },
  ]);
}

async function seedAmbers() {
  if ((await database.collection('ambers').countDocuments()) > 0) {
    return;
  }

  await database.collection('ambers').insertMany([
    {
      _id: 'amber-001',
      code: 'MIA-000001',
      senderUserId: 'user-dat',
      recipientEmail: 'future.me@example.com',
      message:
        'This is a seeded amber. The new architecture now runs on Express and React instead of Supabase Edge Functions.',
      openAt: '2026-04-20T09:00:00.000Z',
      createdBy: 'Dat',
      createdAt: '2026-04-16T01:00:00.000Z',
      status: 'scheduled',
      passcodeHash: security.hashSecret('amber123'),
      archivedAt: null,
    },
    {
      _id: 'amber-002',
      code: 'MIA-000002',
      senderUserId: 'user-dat',
      recipientEmail: 'team@example.com',
      message: 'Ship the rebuild only after the API and frontend agree on the contract.',
      openAt: '2026-04-15T06:00:00.000Z',
      createdBy: 'Dat',
      createdAt: '2026-04-15T02:30:00.000Z',
      status: 'ready',
      passcodeHash: security.hashSecret('amber456'),
      archivedAt: null,
    },
  ]);
}

async function seedDatabase() {
  await seedUsers();
  await seedAmbers();
}

exports.connectToDatabase = async function connectToDatabase() {
  if (database) {
    return database;
  }

  if (connectPromise) {
    return connectPromise;
  }

  connectPromise = (async function initialize() {
    client = new MongoClient(env.mongoUri);
    await client.connect();
    database = client.db(getDatabaseName());
    await ensureIndexes();
    await seedDatabase();
    return database;
  })();

  try {
    return await connectPromise;
  } catch (error) {
    connectPromise = null;
    client = null;
    database = null;
    throw error;
  }
};

exports.getCollection = function getCollection(name) {
  if (!database) {
    throw new Error('MongoDB has not been connected yet');
  }

  return database.collection(name);
};

exports.closeDatabase = async function closeDatabase() {
  if (client) {
    await client.close();
  }

  client = null;
  database = null;
  connectPromise = null;
};
