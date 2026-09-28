import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import { Server } from 'socket.io';
import { env } from '../config/env.js';
import CodeFile from '../models/CodeFile.js';
import Project from '../models/Project.js';
import User from '../models/User.js';

let ioInstance;

function codeRoom(projectId) {
  return `project:${projectId}:code`;
}

function sendSocketError(socket, message) {
  socket.emit('code:error', { message });
}

async function findProjectMembership(projectId, userId) {
  if (!mongoose.isObjectIdOrHexString(projectId)) return null;
  return Project.findOne({ _id: projectId, members: userId });
}

export function initializeCodeSocket(httpServer) {
  ioInstance = new Server(httpServer, {
    cors: {
      origin: env.clientOrigin,
      methods: ['GET', 'POST'],
    },
  });

  ioInstance.use(async (socket, next) => {
    const token = socket.handshake.auth?.token;

    if (typeof token !== 'string' || !env.jwtSecret || Buffer.byteLength(env.jwtSecret) < 32) {
      return next(new Error('Authentication required.'));
    }

    try {
      const payload = jwt.verify(token, env.jwtSecret, { algorithms: ['HS256'] });
      if (typeof payload !== 'object' || typeof payload.sub !== 'string') {
        return next(new Error('Invalid token.'));
      }

      const user = await User.findById(payload.sub);
      if (!user) return next(new Error('Invalid token.'));

      socket.data.user = {
        id: user.id,
        name: user.name,
        email: user.email,
        profilePicture: user.profilePicture,
        role: user.role,
      };
      return next();
    } catch (error) {
      return next(new Error(error instanceof jwt.TokenExpiredError ? 'Token has expired.' : 'Invalid token.'));
    }
  });

  ioInstance.on('connection', (socket) => {
    socket.join(`user:${socket.data.user.id}:notifications`);

    socket.on('code:join', async ({ projectId } = {}) => {
      try {
        const project = await findProjectMembership(projectId, socket.data.user.id);
        if (!project) return sendSocketError(socket, 'Project not found or access denied.');

        const room = codeRoom(projectId);
        await socket.join(room);
        const roomSockets = await ioInstance.in(room).fetchSockets();
        const users = [...new Map(roomSockets.map((item) => [item.data.user.id, item.data.user])).values()];
        ioInstance.to(room).emit('code:presence', { projectId, users });
      } catch {
        sendSocketError(socket, 'Unable to join the project code room.');
      }
    });

    socket.on('code:leave', async ({ projectId } = {}) => {
      const room = codeRoom(projectId);
      if (!socket.rooms.has(room)) return;
      await socket.leave(room);
      const roomSockets = await ioInstance.in(room).fetchSockets();
      const users = [...new Map(roomSockets.map((item) => [item.data.user.id, item.data.user])).values()];
      ioInstance.to(room).emit('code:presence', { projectId, users });
    });

    socket.on('code:change', async ({ projectId, fileId, content } = {}) => {
      const room = codeRoom(projectId);
      if (!socket.rooms.has(room)) return sendSocketError(socket, 'Join the project code room first.');
      if (typeof content !== 'string' || content.length > 1000000) return sendSocketError(socket, 'Invalid code content.');

      try {
        const project = await findProjectMembership(projectId, socket.data.user.id);
        const codeFile = mongoose.isObjectIdOrHexString(fileId)
          ? await CodeFile.findOne({ _id: fileId, project: projectId })
          : null;
        if (!project || !codeFile) return sendSocketError(socket, 'File not found or access denied.');

        socket.to(room).emit('code:update', {
          projectId,
          fileId,
          content,
          user: socket.data.user,
          changedAt: new Date().toISOString(),
        });
      } catch {
        sendSocketError(socket, 'Unable to broadcast code changes.');
      }
    });

    socket.on('code:editing', async ({ projectId, fileId, isEditing } = {}) => {
      const room = codeRoom(projectId);
      if (!socket.rooms.has(room) || !mongoose.isObjectIdOrHexString(fileId)) return;

      try {
        const project = await findProjectMembership(projectId, socket.data.user.id);
        const codeFile = await CodeFile.findOne({ _id: fileId, project: projectId });
        if (!project || !codeFile) return;
        socket.to(room).emit('code:editing', { fileId, user: socket.data.user, isEditing: Boolean(isEditing) });
      } catch {
        sendSocketError(socket, 'Unable to update editing presence.');
      }
    });

    socket.on('disconnecting', () => {
      for (const room of socket.rooms) {
        if (room.startsWith('project:') && room.endsWith(':code')) {
          socket.to(room).emit('code:member-left', { userId: socket.data.user.id });
        }
      }
    });
  });

  return ioInstance;
}

export function getSocketServer() {
  if (!ioInstance) throw new Error('Socket.IO server has not been initialized.');
  return ioInstance;
}