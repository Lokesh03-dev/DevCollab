import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import { createServer } from 'node:http';
import { connectDatabase } from './config/database.js';
import { env } from './config/env.js';
import { errorHandler } from './middleware/errorHandler.js';
import { notFound } from './middleware/notFound.js';
import authRoutes from './routes/authRoutes.js';
import activityRoutes from './routes/activityRoutes.js';
import codeFileRoutes from './routes/codeFileRoutes.js';
import commentRoutes from './routes/commentRoutes.js';
import healthRoutes from './routes/healthRoutes.js';
import invitationRoutes from './routes/invitationRoutes.js';
import githubRoutes from './routes/githubRoutes.js';
import messageRoutes from './routes/messageRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';
import projectRoutes from './routes/projectRoutes.js';
import taskRoutes from './routes/taskRoutes.js';
import userRoutes from './routes/userRoutes.js';
import { initializeChatSocket } from './sockets/chatSocket.js';
import { initializeCodeSocket } from './sockets/codeSocket.js';

const app = express();

app.use(helmet());
app.use(cors({ origin: env.clientOrigin }));
app.use(express.json({ limit: '2mb' }));
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/invitations', invitationRoutes);
app.use('/api', activityRoutes);
app.use('/api', commentRoutes);
app.use('/api', codeFileRoutes);
app.use('/api', messageRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/projects', githubRoutes);
app.use('/api', taskRoutes);
app.use('/api', healthRoutes);
app.use(notFound);
app.use(errorHandler);

const server = createServer(app);
const io = initializeCodeSocket(server);
initializeChatSocket(io);

server.listen(env.port, () => {
  console.log(`Server listening on port ${env.port}`);
  connectDatabase().catch((error) => {
    console.error(error.message);
  });
});