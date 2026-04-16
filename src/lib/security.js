var crypto = require('crypto');

var APP_SECRET = process.env.APP_SECRET || 'mia-dev-secret';

function hashSecret(value) {
  return crypto
    .createHash('sha256')
    .update(APP_SECRET + ':' + value)
    .digest('hex');
}

function compareSecret(value, hashedValue) {
  var first = Buffer.from(hashSecret(value));
  var second = Buffer.from(hashedValue);

  if (first.length !== second.length) {
    return false;
  }

  return crypto.timingSafeEqual(first, second);
}

function createToken() {
  return crypto.randomBytes(24).toString('hex');
}

module.exports = {
  hashSecret: hashSecret,
  compareSecret: compareSecret,
  createToken: createToken,
};
