import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import User from '../models/User.js';

export async function authenticate(req, res, next) {
  const authorization = req.get('authorization') || '';
  const tokenMatch = /^Bearer\s+([^\s]+)$/i.exec(authorization);

  if (!tokenMatch) {
    return res.status(401).json({
      success: false,
      message: 'A Bearer token is required.',
    });
  }

  if (!env.jwtSecret || Buffer.byteLength(env.jwtSecret) < 32) {
    return res.status(503).json({
      success: false,
      message: 'Authentication is not configured. Set JWT_SECRET and restart the server.',
    });
  }

  try {
    const payload = jwt.verify(tokenMatch[1], env.jwtSecret, { algorithms: ['HS256'] });

    if (typeof payload !== 'object' || typeof payload.sub !== 'string') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token.',
      });
    }

    const user = await User.findById(payload.sub);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired token.',
      });
    }

    req.user = user;
    return next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      return res.status(401).json({
        success: false,
        message: 'Token has expired.',
      });
    }

    if (error instanceof jwt.JsonWebTokenError || error.name === 'CastError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token.',
      });
    }

    return next(error);
  }
}