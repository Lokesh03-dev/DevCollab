import dotenv from 'dotenv';

dotenv.config();

const parsedPort = Number(process.env.PORT);

export const env = {
  port: Number.isInteger(parsedPort) && parsedPort > 0 ? parsedPort : 5001,
  clientOrigin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
  mongoUri: process.env.MONGODB_URI,
  jwtSecret: process.env.JWT_SECRET,
  githubToken: process.env.GITHUB_TOKEN,
};