import mongoose from 'mongoose';
import { env } from './env.js';

mongoose.connection.on('error', (error) => {
  console.error(`MongoDB connection error (${error.name}).`);
});

mongoose.connection.on('disconnected', () => {
  console.warn('MongoDB connection lost.');
});

export async function connectDatabase() {
  if (!env.mongoUri?.startsWith('mongodb+srv://')) {
    throw new Error('Set MONGODB_URI to a MongoDB Atlas connection string.');
  }

  try {
    await mongoose.connect(env.mongoUri, { serverSelectionTimeoutMS: 10000 });
    console.log('Connected to MongoDB Atlas.');
  } catch (error) {
    console.error(`MongoDB Atlas connection failed (${error.name}${error.code ? `, code ${error.code}` : ''}).`);
    throw new Error('MongoDB Atlas connection failed.');
  }
}