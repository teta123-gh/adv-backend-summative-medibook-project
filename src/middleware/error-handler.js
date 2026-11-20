function notFound(req, res, next) {
  const error = new Error(`Route not found: ${req.method} ${req.originalUrl}`);
  error.statusCode = 404;
  next(error);
}

function errorHandler(error, req, res, next) {
  if (res.headersSent) return next(error);
  const status = Number.isInteger(error.statusCode) ? error.statusCode : 500;
  res.status(status).json({
    error: status === 500 ? 'Internal server error' : error.message,
  });
}

module.exports = { notFound, errorHandler };
