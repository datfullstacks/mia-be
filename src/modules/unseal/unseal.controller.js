var amberService = require('../amber/amber.service');

function createError(message, statusCode) {
  var error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

exports.unsealAmber = async function unsealAmber(req, res, next) {
  try {
    var code = req.body.code;
    var passcode = req.body.passcode;

    if (!code || typeof code !== 'string') {
      throw createError('code is required', 400);
    }

    if (!passcode || typeof passcode !== 'string') {
      throw createError('passcode is required', 400);
    }

    res.json({
      item: await amberService.unsealAmber({
        code: code.trim(),
        passcode: passcode,
      }),
    });
  } catch (error) {
    next(error);
  }
};
