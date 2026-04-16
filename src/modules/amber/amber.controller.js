var amberService = require('./amber.service');

function createError(message, statusCode) {
  var error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function parsePositiveInteger(value, fallback) {
  var parsed = Number.parseInt(value, 10);

  if (!Number.isInteger(parsed) || parsed < 1) {
    return fallback;
  }

  return parsed;
}

exports.listAmbers = async function listAmbers(req, res, next) {
  var includeArchived = req.query.includeArchived === 'true';
  try {
    res.json(
      await amberService.listAmbersForUser(req.currentUser.id, {
        includeArchived: includeArchived,
        status: req.query.status,
        search: req.query.search,
        page: parsePositiveInteger(req.query.page, 1),
        pageSize: parsePositiveInteger(req.query.pageSize, 4),
      }),
    );
  } catch (error) {
    next(error);
  }
};

exports.createAmber = async function createAmber(req, res, next) {
  try {
    var recipientEmail = req.body.recipientEmail;
    var message = req.body.message;
    var openAt = req.body.openAt;
    var passcode = req.body.passcode;

    if (!recipientEmail || typeof recipientEmail !== 'string' || !recipientEmail.includes('@')) {
      throw createError('recipientEmail must be a valid email', 400);
    }

    if (!message || typeof message !== 'string' || message.trim().length < 10) {
      throw createError('message must be at least 10 characters', 400);
    }

    if (!openAt || Number.isNaN(new Date(openAt).getTime())) {
      throw createError('openAt must be a valid ISO date', 400);
    }

    if (new Date(openAt).getTime() <= Date.now()) {
      throw createError('openAt must be in the future', 400);
    }

    if (!passcode || typeof passcode !== 'string' || passcode.trim().length < 4) {
      throw createError('passcode must be at least 4 characters', 400);
    }

    var amber = await amberService.createAmber({
      senderUserId: req.currentUser.id,
      isAdmin: Boolean(req.currentUser.isAdmin),
      recipientEmail: recipientEmail.trim(),
      message: message.trim(),
      openAt: new Date(openAt).toISOString(),
      createdBy: req.currentUser.name,
      passcode: passcode,
    });

    res.status(201).json({
      item: amber,
    });
  } catch (error) {
    next(error);
  }
};

exports.updateAmber = async function updateAmber(req, res, next) {
  try {
    var amberId = req.params.amberId;
    var recipientEmail = req.body.recipientEmail;
    var message = req.body.message;
    var openAt = req.body.openAt;
    var passcode = req.body.passcode;

    if (!amberId) {
      throw createError('amberId is required', 400);
    }

    if (!recipientEmail || typeof recipientEmail !== 'string' || !recipientEmail.includes('@')) {
      throw createError('recipientEmail must be a valid email', 400);
    }

    if (!message || typeof message !== 'string' || message.trim().length < 10) {
      throw createError('message must be at least 10 characters', 400);
    }

    if (!openAt || Number.isNaN(new Date(openAt).getTime())) {
      throw createError('openAt must be a valid ISO date', 400);
    }

    if (new Date(openAt).getTime() <= Date.now()) {
      throw createError('openAt must be in the future', 400);
    }

    if (passcode !== undefined && (typeof passcode !== 'string' || passcode.trim().length < 4)) {
      throw createError('passcode must be at least 4 characters when provided', 400);
    }

    var amber = await amberService.updateAmberForUser(req.currentUser.id, amberId, {
      recipientEmail: recipientEmail.trim(),
      message: message.trim(),
      openAt: new Date(openAt).toISOString(),
      passcode: typeof passcode === 'string' && passcode.trim() ? passcode.trim() : null,
    });

    res.json({
      item: amber,
    });
  } catch (error) {
    next(error);
  }
};

exports.cancelAmber = async function cancelAmber(req, res, next) {
  try {
    var amberId = req.params.amberId;

    if (!amberId) {
      throw createError('amberId is required', 400);
    }

    var amber = await amberService.cancelAmberForUser(req.currentUser.id, amberId);

    res.json({
      item: amber,
    });
  } catch (error) {
    next(error);
  }
};

exports.archiveAmber = async function archiveAmber(req, res, next) {
  try {
    var amberId = req.params.amberId;

    if (!amberId) {
      throw createError('amberId is required', 400);
    }

    var amber = await amberService.archiveAmberForUser(req.currentUser.id, amberId);

    res.json({
      item: amber,
    });
  } catch (error) {
    next(error);
  }
};
