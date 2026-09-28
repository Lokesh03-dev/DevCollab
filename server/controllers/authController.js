import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import { env } from '../config/env.js';
import User from '../models/User.js';

const SALT_ROUNDS = 12;
const TOKEN_EXPIRATION = '1h';

function toSafeUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    profilePicture: user.profilePicture,
    role: user.role,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

export async function register(req, res, next) {
  const { name, email, password } = req.body ?? {};

  if (
    typeof name !== 'string' ||
    !name.trim() ||
    typeof email !== 'string' ||
    !email.trim() ||
    typeof password !== 'string' ||
    !password.trim()
  ) {
    return res.status(400).json({
      success: false,
      message: 'Name, email, and password are required.',
    });
  }

  const passwordLength = Buffer.byteLength(password, 'utf8');
  if (passwordLength < 8 || passwordLength > 72) {
    return res.status(400).json({
      success: false,
      message: 'Password must be between 8 and 72 UTF-8 bytes.',
    });
  }

  const user = new User({
    name: name.trim(),
    email: email.trim(),
    password,
  });
  const validationError = user.validateSync();

  if (validationError) {
    return res.status(400).json({
      success: false,
      message: 'Invalid registration details.',
      errors: Object.values(validationError.errors).map(({ message }) => message),
    });
  }

  if (mongoose.connection.readyState !== 1) {
    return res.status(503).json({
      success: false,
      message: 'Database is unavailable. Configure MongoDB Atlas and restart the server.',
    });
  }

  try {
    const existingUser = await User.exists({ email: user.email });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'An account with this email already exists.',
      });
    }

    user.password = await bcrypt.hash(password, SALT_ROUNDS);
    await user.save();

    return res.status(201).json({
      success: true,
      user: toSafeUser(user),
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: 'An account with this email already exists.',
      });
    }

    if (error.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        message: 'Invalid registration details.',
        errors: Object.values(error.errors).map(({ message }) => message),
      });
    }

    return next(error);
  }
}

export async function login(req, res, next) {
  const { email, password } = req.body ?? {};

  if (
    typeof email !== 'string' ||
    !email.trim() ||
    typeof password !== 'string' ||
    !password.trim()
  ) {
    return res.status(400).json({
      success: false,
      message: 'Email and password are required.',
    });
  }

  if (Buffer.byteLength(password, 'utf8') > 72) {
    return res.status(400).json({
      success: false,
      message: 'Password must be 72 UTF-8 bytes or fewer.',
    });
  }

  if (mongoose.connection.readyState !== 1) {
    return res.status(503).json({
      success: false,
      message: 'Database is unavailable. Configure MongoDB Atlas and restart the server.',
    });
  }

  if (!env.jwtSecret || Buffer.byteLength(env.jwtSecret) < 32) {
    return res.status(503).json({
      success: false,
      message: 'Authentication is not configured. Set JWT_SECRET and restart the server.',
    });
  }

  try {
    const user = await User.findOne({ email: email.trim().toLowerCase() }).select('+password');

    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.',
      });
    }

    const token = jwt.sign(
      { sub: user.id, role: user.role },
      env.jwtSecret,
      { expiresIn: TOKEN_EXPIRATION, algorithm: 'HS256' },
    );

    return res.status(200).json({
      success: true,
      token,
      tokenType: 'Bearer',
      expiresIn: TOKEN_EXPIRATION,
      user: toSafeUser(user),
    });
  } catch (error) {
    return next(error);
  }
}

export function getCurrentUser(req, res) {
  return res.status(200).json({
    success: true,
    user: toSafeUser(req.user),
  });
}