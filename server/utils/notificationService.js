import Notification from '../models/Notification.js';
import User from '../models/User.js';
import { getSocketServer } from '../sockets/codeSocket.js';

const safePopulate = [
  { path: 'sender', select: 'name email profilePicture' },
  { path: 'project', select: 'name' },
  { path: 'task', select: 'title' },
];

export async function createNotification({ recipient, sender, type, message, project, task = null }) {
  if (!recipient || !sender || recipient.toString() === sender.toString()) {
    return null;
  }

  let notification;

  try {
    notification = await Notification.create({ recipient, sender, type, message, project, task });
    await notification.populate(safePopulate);
  } catch (error) {
    console.error(`Unable to create notification (${error.name}).`);
    return null;
  }

  try {
    getSocketServer()
      .to(`user:${recipient.toString()}:notifications`)
      .emit('notification:new', { notification });
  } catch (error) {
    console.error(`Unable to deliver notification live (${error.message}).`);
  }

  return notification;
}

export async function createMentionNotifications({ mentionedUsers, sender, project, message, task = null }) {
  return Promise.all((mentionedUsers || []).map((recipient) => createNotification({
    recipient,
    sender,
    type: 'mention',
    message,
    project,
    task,
  })));
}

export async function notifyProjectMentions({ project, sender, activityText, task = null }) {
  const mentionTokens = new Set(
    [...activityText.matchAll(/@([a-z0-9._+-]+)/gi)].map((match) => match[1].toLowerCase()),
  );

  if (mentionTokens.size === 0) return [];

  const members = await User.find({ _id: { $in: project.members, $ne: sender._id } })
    .select('name email');
  const mentionedUsers = members.filter((member) => {
    const normalizedName = member.name.replace(/\s+/g, '').toLowerCase();
    const emailName = member.email.split('@')[0].toLowerCase();
    return mentionTokens.has(normalizedName) || mentionTokens.has(emailName) || mentionTokens.has(member.email.toLowerCase());
  });

  return createMentionNotifications({
    mentionedUsers,
    sender: sender._id,
    project: project._id,
    task: task?._id,
    message: `${sender.name} mentioned you in a comment${task ? ` on "${task.title}"` : ''}.`,
  });
}