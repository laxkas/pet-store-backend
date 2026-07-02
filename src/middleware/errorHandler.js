const logger = require('../logger');

function errorHandler(err, req, res, next) {
  console.error(err.stack);
  logger.error('unhandled_error', {
    method: req.method,
    path: req.originalUrl,
    error: err.message,
    stack: err.stack,
  });
  res.status(500).json({ error: 'Internal server error' });
}

module.exports = errorHandler;
