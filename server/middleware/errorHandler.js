export function errorHandler(error, req, res, next) {
  if (res.headersSent) {
    return next(error);
  }

  let statusCode = error.statusCode || error.status || 500;
  let message = 'Internal server error.';
  let errors;

  if (error.code === 11000) {
    statusCode = 409;
    message = 'A record with this value already exists.';
  } else if (error.name === 'ValidationError') {
    statusCode = 400;
    message = 'Request validation failed.';
    errors = Object.values(error.errors || {}).map(({ message: validationMessage }) => validationMessage);
  } else if (error.name === 'CastError') {
    statusCode = 400;
    message = 'Request contains an invalid identifier or value.';
  } else if (error.type === 'entity.parse.failed') {
    statusCode = 400;
    message = 'Request body contains invalid JSON.';
  } else if (error.type === 'entity.too.large') {
    statusCode = 413;
    message = 'Request body is too large.';
  } else if (error.name === 'MongooseServerSelectionError' || error.name === 'MongoNetworkError') {
    statusCode = 503;
    message = 'Database service is unavailable. Please try again.';
  } else if (statusCode >= 400 && statusCode < 500) {
    message = error.message || 'Request could not be completed.';
  }

  if (!Number.isInteger(statusCode) || statusCode < 400 || statusCode > 599) {
    statusCode = 500;
    message = 'Internal server error.';
    errors = undefined;
  }

  if (statusCode >= 500) {
    console.error('Request failed.', {
      name: error.name,
      code: error.code,
      method: req.method,
      path: req.path,
    });
  }

  const response = {
    success: false,
    message,
  };
  if (errors) response.errors = errors;

  return res.status(statusCode).json(response);
}