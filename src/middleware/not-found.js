module.exports = function notFoundHandler(req, res, next) {
  if (res.headersSent) {
    return next();
  }

  res.status(404).json({
    message: 'Route not found',
    path: req.originalUrl,
  });
};
