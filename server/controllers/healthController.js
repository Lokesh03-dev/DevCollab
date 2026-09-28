import mongoose from 'mongoose';

export function getHealth(req, res) {
  res.json({
    success: true,
    message: 'Server is running',
  });
}

export function getDatabaseHealth(req, res) {
  const connected = mongoose.connection.readyState === 1;

  res.status(connected ? 200 : 503).json({
    success: connected,
    message: connected ? 'Server and database are connected' : 'Database is not connected',
  });
}