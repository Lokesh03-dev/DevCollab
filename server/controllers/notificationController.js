import mongoose from 'mongoose';
import Notification from '../models/Notification.js';

const populateOptions = [
  { path: 'sender', select: 'name email profilePicture' },
  { path: 'project', select: 'name' },
  { path: 'task', select: 'title' },
];

export async function getNotifications(req, res, next) {
  try {
    const [notifications, unreadCount] = await Promise.all([
      Notification.find({ recipient: req.user._id })
        .sort({ createdAt: -1 })
        .limit(50)
        .populate(populateOptions),
      Notification.countDocuments({ recipient: req.user._id, read: false }),
    ]);

    return res.status(200).json({
      success: true,
      data: { notifications, unreadCount },
    });
  } catch (error) {
    return next(error);
  }
}

export async function markNotificationRead(req, res, next) {
  if (!mongoose.isObjectIdOrHexString(req.params.id)) {
    return res.status(400).json({ success: false, message: 'Invalid notification ID.' });
  }

  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, recipient: req.user._id },
      { $set: { read: true } },
      { new: true },
    ).populate(populateOptions);

    if (!notification) {
      return res.status(404).json({ success: false, message: 'Notification not found.' });
    }

    return res.status(200).json({ success: true, data: { notification } });
  } catch (error) {
    return next(error);
  }
}

export async function markAllNotificationsRead(req, res, next) {
  try {
    await Notification.updateMany(
      { recipient: req.user._id, read: false },
      { $set: { read: true } },
    );

    return res.status(200).json({ success: true, data: { unreadCount: 0 } });
  } catch (error) {
    return next(error);
  }
}