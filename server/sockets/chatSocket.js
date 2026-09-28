import mongoose from 'mongoose';
import Message from '../models/Message.js';
import Project from '../models/Project.js';
import User from '../models/User.js';

const senderProjection = 'name email profilePicture';

function directRoom(firstUserId, secondUserId) {
  return `direct:${[firstUserId.toString(), secondUserId.toString()].sort().join(':')}`;
}

function chatRoom(projectId) {
  return `project:${projectId}:chat`;
}

function emitError(socket, message) {
  socket.emit('chat:error', { message });
}

async function findProjectMembership(projectId, userId) {
  if (!mongoose.isObjectIdOrHexString(projectId)) return null;
  return Project.findOne({ _id: projectId, members: userId });
}

async function updatePresence(io, projectId, room) {
  const sockets = await io.in(room).fetchSockets();
  const users = [...new Map(sockets.map((socket) => [socket.data.user.id, socket.data.user])).values()];
  io.to(room).emit('chat:presence', { projectId, users });
}

export function initializeChatSocket(io) {
  io.on('connection', (socket) => {
    socket.on('dm:join', async ({ userId } = {}, acknowledge = () => {}) => {
      if (typeof acknowledge !== 'function') acknowledge = () => {};
      if (!mongoose.isObjectIdOrHexString(userId) || userId === socket.data.user.id) {
        return acknowledge({ success: false, message: 'Invalid conversation user.' });
      }

      try {
        const recipientExists = await User.exists({ _id: userId });
        if (!recipientExists) return acknowledge({ success: false, message: 'User not found.' });
        await socket.join(directRoom(socket.data.user.id, userId));
        return acknowledge({ success: true });
      } catch {
        return acknowledge({ success: false, message: 'Unable to open this conversation.' });
      }
    });

    socket.on('dm:leave', ({ userId } = {}) => {
      if (!mongoose.isObjectIdOrHexString(userId)) return;
      socket.leave(directRoom(socket.data.user.id, userId));
    });

    socket.on('dm:send', async ({ userId, message } = {}, acknowledge = () => {}) => {
      if (typeof acknowledge !== 'function') acknowledge = () => {};
      const room = directRoom(socket.data.user.id, userId || '');

      if (!mongoose.isObjectIdOrHexString(userId) || !socket.rooms.has(room)) {
        return acknowledge({ success: false, message: 'Open this conversation before sending a message.' });
      }
      if (typeof message !== 'string' || !message.trim() || message.trim().length > 4000) {
        return acknowledge({ success: false, message: 'Message must contain 1 to 4000 characters.' });
      }

      try {
        const recipient = await User.findById(userId).select('_id');
        if (!recipient) return acknowledge({ success: false, message: 'User not found.' });

        const savedMessage = await Message.create({
          sender: socket.data.user.id,
          recipient: recipient._id,
          message: message.trim(),
        });
        await savedMessage.populate([
          { path: 'sender', select: senderProjection },
          { path: 'recipient', select: senderProjection },
        ]);
        const response = { success: true, data: { message: savedMessage } };
        socket.to(room).emit('dm:message', response.data);
        return acknowledge(response);
      } catch {
        return acknowledge({ success: false, message: 'Unable to save your message.' });
      }
    });

    socket.on('chat:join', async ({ projectId } = {}) => {
      try {
        const project = await findProjectMembership(projectId, socket.data.user.id);
        if (!project) return emitError(socket, 'Project not found or access denied.');

        const room = chatRoom(projectId);
        await socket.join(room);
        await updatePresence(io, projectId, room);
      } catch {
        emitError(socket, 'Unable to join the project chat.');
      }
    });

    socket.on('chat:leave', async ({ projectId } = {}) => {
      const room = chatRoom(projectId);
      if (!socket.rooms.has(room)) return;

      await socket.leave(room);
      try {
        await updatePresence(io, projectId, room);
      } catch {
        emitError(socket, 'Unable to update chat presence.');
      }
    });

    socket.on('chat:send', async ({ projectId, message } = {}, acknowledge = () => {}) => {
      if (typeof acknowledge !== 'function') acknowledge = () => {};
      const room = chatRoom(projectId);

      if (!socket.rooms.has(room)) {
        return acknowledge({ success: false, message: 'Join the project chat first.' });
      }

      if (typeof message !== 'string' || !message.trim() || message.trim().length > 4000) {
        return acknowledge({ success: false, message: 'Message must contain 1 to 4000 characters.' });
      }

      try {
        const project = await findProjectMembership(projectId, socket.data.user.id);
        if (!project) {
          await socket.leave(room);
          await updatePresence(io, projectId, room);
          return acknowledge({ success: false, message: 'Project access denied.' });
        }

        const savedMessage = await Message.create({
          project: project._id,
          sender: socket.data.user.id,
          message: message.trim(),
        });
        await savedMessage.populate('sender', senderProjection);
        const response = { message: savedMessage };

        socket.to(room).emit('chat:message', response);
        return acknowledge({ success: true, data: response });
      } catch {
        return acknowledge({ success: false, message: 'Unable to save your message.' });
      }
    });

    socket.on('disconnecting', () => {
      for (const room of socket.rooms) {
        const match = /^project:([a-f\d]{24}):chat$/i.exec(room);
        if (match) {
          socket.to(room).emit('chat:member-left', { userId: socket.data.user.id });
        }
      }
    });

    socket.on('disconnect', async () => {
      for (const room of socket.rooms) {
        const match = /^project:([a-f\d]{24}):chat$/i.exec(room);
        if (match) {
          try {
            await updatePresence(io, match[1], room);
          } catch {
            // The socket is already disconnected; presence will refresh on the next join.
          }
        }
      }
    });
  });
}