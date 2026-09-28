import mongoose from 'mongoose';
import Message from '../models/Message.js';
import Project from '../models/Project.js';
import User from '../models/User.js';

const senderProjection = 'name email profilePicture';
const directMessagePopulate = [
  { path: 'sender', select: senderProjection },
  { path: 'recipient', select: senderProjection },
];

function idOf(value) {
  return value?._id?.toString() || value?.id?.toString() || value?.toString();
}

export async function getProjectMessages(req, res, next) {
  const { projectId } = req.params;

  if (!mongoose.isObjectIdOrHexString(projectId)) {
    return res.status(400).json({ success: false, message: 'Invalid project ID.' });
  }

  try {
    const project = await Project.findOne({ _id: projectId, members: req.user._id });

    if (!project) {
      const exists = await Project.exists({ _id: projectId });
      return res.status(exists ? 403 : 404).json({
        success: false,
        message: exists ? 'You are not a member of this project.' : 'Project not found.',
      });
    }

    const messages = await Message.find({ project: project._id })
      .sort({ createdAt: -1 })
      .limit(100)
      .populate('sender', senderProjection);

    return res.status(200).json({
      success: true,
      data: { messages: messages.reverse() },
    });
  } catch (error) {
    return next(error);
  }
}

export async function searchUsers(req, res, next) {
  const query = typeof req.query.q === 'string' ? req.query.q.trim() : '';
  if (query.length < 2) {
    return res.status(400).json({ success: false, message: 'Search must contain at least two characters.' });
  }

  const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  try {
    const users = await User.find({
      _id: { $ne: req.user._id },
      $or: [
        { name: { $regex: escapedQuery, $options: 'i' } },
        { email: { $regex: escapedQuery, $options: 'i' } },
      ],
    }).select('name email profilePicture role').sort({ name: 1 }).limit(20);

    return res.status(200).json({ success: true, data: { users } });
  } catch (error) {
    return next(error);
  }
}

export async function getDirectConversations(req, res, next) {
  try {
    const messages = await Message.find({
      project: null,
      recipient: { $ne: null },
      $or: [{ sender: req.user._id }, { recipient: req.user._id }],
    })
      .sort({ createdAt: -1 })
      .limit(500)
      .populate(directMessagePopulate);

    const conversations = new Map();
    for (const message of messages) {
      const peer = idOf(message.sender) === req.user.id ? message.recipient : message.sender;
      const peerId = idOf(peer);
      if (peerId && !conversations.has(peerId)) {
        conversations.set(peerId, { user: peer, lastMessage: message });
      }
    }

    return res.status(200).json({ success: true, data: { conversations: [...conversations.values()] } });
  } catch (error) {
    return next(error);
  }
}

export async function getDirectMessages(req, res, next) {
  const { userId } = req.params;
  if (!mongoose.isObjectIdOrHexString(userId) || userId === req.user.id) {
    return res.status(400).json({ success: false, message: 'Invalid conversation user.' });
  }

  try {
    const recipient = await User.findById(userId).select('name email profilePicture role');
    if (!recipient) return res.status(404).json({ success: false, message: 'User not found.' });

    const messages = await Message.find({
      project: null,
      recipient: { $ne: null },
      $or: [
        { sender: req.user._id, recipient: userId },
        { sender: userId, recipient: req.user._id },
      ],
    })
      .sort({ createdAt: -1 })
      .limit(100)
      .populate(directMessagePopulate);

    return res.status(200).json({
      success: true,
      data: { user: recipient, messages: messages.reverse() },
    });
  } catch (error) {
    return next(error);
  }
}