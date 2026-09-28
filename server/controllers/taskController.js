import mongoose from 'mongoose';
import Project from '../models/Project.js';
import Task from '../models/Task.js';
import User from '../models/User.js';
import { recordActivity } from '../utils/activityService.js';
import { createNotification } from '../utils/notificationService.js';

const statuses = ['todo', 'in-progress', 'completed'];
const priorities = ['low', 'medium', 'high'];
const writableFields = new Set(['title', 'description', 'assignedTo', 'status', 'priority', 'dueDate']);
const userProjection = 'name email profilePicture';

function validateTaskBody(body, requireTitle = false) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return 'Request body must be a JSON object.';
  }

  if (Object.keys(body).some((field) => !writableFields.has(field))) {
    return 'Request contains unsupported task fields.';
  }

  if (requireTitle && (typeof body.title !== 'string' || !body.title.trim())) {
    return 'Task title is required.';
  }

  if ('title' in body && (typeof body.title !== 'string' || !body.title.trim())) {
    return 'Task title must be a non-empty string.';
  }

  if ('description' in body && typeof body.description !== 'string') {
    return 'Task description must be a string.';
  }

  if ('status' in body && !statuses.includes(body.status)) {
    return 'Status must be todo, in-progress, or completed.';
  }

  if ('priority' in body && !priorities.includes(body.priority)) {
    return 'Priority must be low, medium, or high.';
  }

  if (
    'assignedTo' in body &&
    body.assignedTo !== null &&
    (typeof body.assignedTo !== 'string' || !mongoose.isObjectIdOrHexString(body.assignedTo))
  ) {
    return 'assignedTo must be a valid user ID or null.';
  }

  if (
    'dueDate' in body &&
    body.dueDate !== null &&
    (typeof body.dueDate !== 'string' || Number.isNaN(Date.parse(body.dueDate)))
  ) {
    return 'dueDate must be a valid date string or null.';
  }

  return null;
}

function isProjectMember(project, userId) {
  return project.members.some((memberId) => memberId.equals(userId));
}

function populateTask(task) {
  return task
    .populate('assignedTo', userProjection)
    .populate('createdBy', userProjection);
}

function sendTaskError(error, res, next) {
  if (error.name === 'ValidationError' || error.name === 'CastError') {
    return res.status(400).json({ success: false, message: error.message });
  }

  return next(error);
}

export async function createTask(req, res, next) {
  if (!mongoose.isObjectIdOrHexString(req.params.projectId)) {
    return res.status(400).json({ success: false, message: 'Invalid project ID.' });
  }

  const bodyError = validateTaskBody(req.body, true);

  if (bodyError) {
    return res.status(400).json({ success: false, message: bodyError });
  }

  try {
    const project = await Project.findById(req.params.projectId);

    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found.' });
    }

    if (!isProjectMember(project, req.user._id)) {
      return res.status(403).json({ success: false, message: 'You are not a member of this project.' });
    }

    if (req.body.assignedTo && !isProjectMember(project, req.body.assignedTo)) {
      return res.status(400).json({ success: false, message: 'Assignee must be a project member.' });
    }

    const task = await Task.create({
      title: req.body.title.trim(),
      description: req.body.description?.trim() ?? '',
      project: project._id,
      assignedTo: req.body.assignedTo ?? null,
      createdBy: req.user._id,
      status: req.body.status ?? 'todo',
      priority: req.body.priority ?? 'medium',
      dueDate: req.body.dueDate ?? undefined,
    });

    await recordActivity({
      project: project._id,
      user: req.user._id,
      type: 'task_created',
      description: `${req.user.name} created task ${task.title}.`,
      relatedTask: task._id,
    });

    if (task.assignedTo) {
      const assignee = await User.findById(task.assignedTo).select('name');
      await recordActivity({
        project: project._id,
        user: req.user._id,
        type: 'task_assigned',
        description: `${req.user.name} assigned ${task.title} to ${assignee?.name || 'a member'}.`,
        relatedTask: task._id,
      });
      await createNotification({
        recipient: task.assignedTo,
        sender: req.user._id,
        type: 'task_assigned',
        message: `You were assigned "${task.title}" in ${project.name}.`,
        project: project._id,
        task: task._id,
      });
    }

    await populateTask(task);
    return res.status(201).json({ success: true, data: { task } });
  } catch (error) {
    return sendTaskError(error, res, next);
  }
}

export async function getProjectTasks(req, res, next) {
  if (!mongoose.isObjectIdOrHexString(req.params.projectId)) {
    return res.status(400).json({ success: false, message: 'Invalid project ID.' });
  }

  try {
    const project = await Project.findById(req.params.projectId);

    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found.' });
    }

    if (!isProjectMember(project, req.user._id)) {
      return res.status(403).json({ success: false, message: 'You are not a member of this project.' });
    }

    const tasks = await Task.find({ project: project._id })
      .sort({ createdAt: -1 })
      .populate('assignedTo', userProjection)
      .populate('createdBy', userProjection);

    return res.status(200).json({ success: true, data: { tasks } });
  } catch (error) {
    return next(error);
  }
}

async function findTaskForMember(taskId, userId) {
  const task = await Task.findById(taskId);

  if (!task) {
    return { error: { status: 404, message: 'Task not found.' } };
  }

  const project = await Project.findById(task.project);

  if (!project) {
    return { error: { status: 404, message: 'Project not found.' } };
  }

  if (!isProjectMember(project, userId)) {
    return { error: { status: 403, message: 'You are not a member of this project.' } };
  }

  return { project, task };
}

export async function updateTask(req, res, next) {
  if (!mongoose.isObjectIdOrHexString(req.params.taskId)) {
    return res.status(400).json({ success: false, message: 'Invalid task ID.' });
  }

  const bodyError = validateTaskBody(req.body);

  if (bodyError) {
    return res.status(400).json({ success: false, message: bodyError });
  }

  if (Object.keys(req.body).length === 0) {
    return res.status(400).json({ success: false, message: 'At least one task field is required.' });
  }

  try {
    const result = await findTaskForMember(req.params.taskId, req.user._id);

    if (result.error) {
      return res.status(result.error.status).json({ success: false, message: result.error.message });
    }

    const { project, task } = result;
    const previousAssignedTo = task.assignedTo?.toString();
    const previousStatus = task.status;

    if (req.body.assignedTo && !isProjectMember(project, req.body.assignedTo)) {
      return res.status(400).json({ success: false, message: 'Assignee must be a project member.' });
    }

    for (const field of writableFields) {
      if (field in req.body) {
        task[field] = typeof req.body[field] === 'string'
          ? req.body[field].trim()
          : req.body[field];
      }
    }

    await task.save();

    if (task.assignedTo && task.assignedTo.toString() !== previousAssignedTo) {
      const assignee = await User.findById(task.assignedTo).select('name');
      await recordActivity({
        project: project._id,
        user: req.user._id,
        type: 'task_assigned',
        description: `${req.user.name} assigned ${task.title} to ${assignee?.name || 'a member'}.`,
        relatedTask: task._id,
      });
      await createNotification({
        recipient: task.assignedTo,
        sender: req.user._id,
        type: 'task_assigned',
        message: `You were assigned "${task.title}" in ${project.name}.`,
        project: project._id,
        task: task._id,
      });
    }

    if (previousStatus !== 'completed' && task.status === 'completed' && task.assignedTo) {
      await recordActivity({
        project: project._id,
        user: req.user._id,
        type: 'task_completed',
        description: `${req.user.name} completed task ${task.title}.`,
        relatedTask: task._id,
      });
      await createNotification({
        recipient: task.assignedTo,
        sender: req.user._id,
        type: 'task_completed',
        message: `"${task.title}" was completed in ${project.name}.`,
        project: project._id,
        task: task._id,
      });
    }

    if (previousStatus !== 'completed' && task.status === 'completed' && !task.assignedTo) {
      await recordActivity({
        project: project._id,
        user: req.user._id,
        type: 'task_completed',
        description: `${req.user.name} completed task ${task.title}.`,
        relatedTask: task._id,
      });
    }

    await populateTask(task);
    return res.status(200).json({ success: true, data: { task } });
  } catch (error) {
    return sendTaskError(error, res, next);
  }
}

export async function deleteTask(req, res, next) {
  if (!mongoose.isObjectIdOrHexString(req.params.taskId)) {
    return res.status(400).json({ success: false, message: 'Invalid task ID.' });
  }

  try {
    const result = await findTaskForMember(req.params.taskId, req.user._id);

    if (result.error) {
      return res.status(result.error.status).json({ success: false, message: result.error.message });
    }

    await result.task.deleteOne();
    return res.status(200).json({ success: true, data: { id: result.task.id } });
  } catch (error) {
    return next(error);
  }
}