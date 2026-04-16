module.exports = function errorHandler(err, _req, res, _next) {
  var statusCode = err.statusCode || 500;

  res.status(statusCode).json({
    message: err.message || 'Unexpected server error',
  });
};
