import mongoose from 'mongoose';
import Comment from '../models/Comment.js';
import Project from '../models/Project.js';
import Task from '../models/Task.js';
import { recordActivity } from '../utils/activityService.js';
import { createNotification, notifyProjectMentions } from '../utils/notificationService.js';

const userProjection = 'name email profilePicture role';

function validateText(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return 'Request body must be a JSON object.';
  }

  if (Object.keys(body).some((field) => field !== 'text')) {
    return 'Only comment text can be changed.';
  }

  if (typeof body.text !== 'string' || !body.text.trim()) {
    return 'Comment text is required.';
  }

  if (body.text.length > 5000) {
    return 'Comment text must be 5000 characters or fewer.';
  }

  return null;
}

async function findAccessibleTask(taskId, userId) {
  const task = await Task.findById(taskId);

  if (!task) {
    return { error: { status: 404, message: 'Task not found.' } };
  }

  const project = await Project.findById(task.project);

  if (!project) {
    return { error: { status: 404, message: 'Project not found.' } };
  }

  if (!project.members.some((memberId) => memberId.equals(userId))) {
    return { error: { status: 403, message: 'You are not a member of this project.' } };
  }

  return { project, task };
}

function sendCommentError(error, res, next) {
  if (error.name === 'ValidationError' || error.name === 'CastError') {
    return res.status(400).json({ success: false, message: error.message });
  }

  return next(error);
}

export async function createComment(req, res, next) {
  if (!mongoose.isObjectIdOrHexString(req.params.taskId)) {
    return res.status(400).json({ success: false, message: 'Invalid task ID.' });
  }

  const bodyError = validateText(req.body);

  if (bodyError) {
    return res.status(400).json({ success: false, message: bodyError });
  }

  try {
    const result = await findAccessibleTask(req.params.taskId, req.user._id);

    if (result.error) {
      return res.status(result.error.status).json({ success: false, message: result.error.message });
    }

    const comment = await Comment.create({
      task: result.task._id,
      user: req.user._id,
      text: req.body.text.trim(),
    });
    await comment.populate('user', userProjection);
    await recordActivity({
      project: result.project._id,
      user: req.user._id,
      type: 'comment_added',
      description: `${req.user.name} commented on task ${result.task.title}.`,
      relatedTask: result.task._id,
    });

    if (result.task.assignedTo) {
      await createNotification({
        recipient: result.task.assignedTo,
        sender: req.user._id,
        type: 'task_commented',
        message: `${req.user.name} commented on "${result.task.title}".`,
        project: result.project._id,
        task: result.task._id,
      });
    }

    await notifyProjectMentions({
      project: result.project,
      sender: req.user,
      activityText: req.body.text,
      task: result.task,
    });

    return res.status(201).json({ success: true, data: { comment } });
  } catch (error) {
    return sendCommentError(error, res, next);
  }
}

export async function getTaskComments(req, res, next) {
  if (!mongoose.isObjectIdOrHexString(req.params.taskId)) {
    return res.status(400).json({ success: false, message: 'Invalid task ID.' });
  }

  try {
    const result = await findAccessibleTask(req.params.taskId, req.user._id);

    if (result.error) {
      return res.status(result.error.status).json({ success: false, message: result.error.message });
    }

    const comments = await Comment.find({ task: result.task._id })
      .sort({ createdAt: 1 })
      .populate('user', userProjection);

    return res.status(200).json({ success: true, data: { comments } });
  } catch (error) {
    return next(error);
  }
}

async function findCommentForMember(commentId, userId) {
  const comment = await Comment.findById(commentId);

  if (!comment) {
    return { error: { status: 404, message: 'Comment not found.' } };
  }

  const access = await findAccessibleTask(comment.task, userId);

  if (access.error) {
    return access;
  }

  return { comment, project: access.project };
}

function canModerateComment(comment, project, user) {
  return comment.user.equals(user._id) || project.owner.equals(user._id) || user.role === 'admin';
}

export async function updateComment(req, res, next) {
  if (!mongoose.isObjectIdOrHexString(req.params.commentId)) {
    return res.status(400).json({ success: false, message: 'Invalid comment ID.' });
  }

  const bodyError = validateText(req.body);

  if (bodyError) {
    return res.status(400).json({ success: false, message: bodyError });
  }

  try {
    const result = await findCommentForMember(req.params.commentId, req.user._id);

    if (result.error) {
      return res.status(result.error.status).json({ success: false, message: result.error.message });
    }

    if (!canModerateComment(result.comment, result.project, req.user)) {
      return res.status(403).json({ success: false, message: 'You cannot edit this comment.' });
    }

    result.comment.text = req.body.text.trim();
    await result.comment.save();
    await result.comment.populate('user', userProjection);

    return res.status(200).json({ success: true, data: { comment: result.comment } });
  } catch (error) {
    return sendCommentError(error, res, next);
  }
}

export async function deleteComment(req, res, next) {
  if (!mongoose.isObjectIdOrHexString(req.params.commentId)) {
    return res.status(400).json({ success: false, message: 'Invalid comment ID.' });
  }

  try {
    const result = await findCommentForMember(req.params.commentId, req.user._id);

    if (result.error) {
      return res.status(result.error.status).json({ success: false, message: result.error.message });
    }

    if (!canModerateComment(result.comment, result.project, req.user)) {
      return res.status(403).json({ success: false, message: 'You cannot delete this comment.' });
    }

    await result.comment.deleteOne();
    return res.status(200).json({ success: true, data: { id: result.comment.id } });
  } catch (error) {
    return next(error);
  }
}