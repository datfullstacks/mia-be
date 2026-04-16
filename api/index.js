var app = require('../app');
var db = require('../src/lib/db');

module.exports = async function handler(req, res) {
  await db.connectToDatabase();
  return app(req, res);
};
