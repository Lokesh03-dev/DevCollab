import mongoose from 'mongoose';
import Project from '../models/Project.js';
import User from '../models/User.js';
import { recordActivity } from '../utils/activityService.js';
import { createNotification } from '../utils/notificationService.js';

const statuses = ['planning', 'active', 'completed'];
const writableFields = new Set(['name', 'description', 'status', 'technologies', 'startDate', 'endDate']);
const userProjection = 'name email profilePicture role';

function isValidDateOnly(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.valueOf()) && date.toISOString().slice(0, 10) === value;
}

function sendProjectError(error, res, next) {
  if (error.name === 'ValidationError' || error.name === 'CastError') {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }

  return next(error);
}

function validateBody(body, requireName = false) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return 'Request body must be a JSON object.';
  }

  if (Object.keys(body).some((field) => !writableFields.has(field))) {
    return 'Only name, description, status, and technologies can be changed.';
  }

  if (requireName && (typeof body.name !== 'string' || !body.name.trim())) {
    return 'Project name is required.';
  }

  if (requireName && (!isValidDateOnly(body.startDate) || !isValidDateOnly(body.endDate))) {
    return 'A valid project start date and end date are required.';
  }

  if ('name' in body && (typeof body.name !== 'string' || !body.name.trim())) {
    return 'Project name must be a non-empty string.';
  }

  if ('description' in body && typeof body.description !== 'string') {
    return 'Description must be a string.';
  }

  if ('status' in body && !statuses.includes(body.status)) {
    return 'Status must be planning, active, or completed.';
  }

  for (const field of ['startDate', 'endDate']) {
    if (field in body && !isValidDateOnly(body[field])) {
      return `${field === 'startDate' ? 'Start' : 'End'} date must be a valid calendar date.`;
    }
  }

  if (isValidDateOnly(body.startDate) && isValidDateOnly(body.endDate) && body.endDate < body.startDate) {
    return 'Project end date must be on or after its start date.';
  }

  if (
    'technologies' in body &&
    (!Array.isArray(body.technologies) ||
      body.technologies.some((technology) => typeof technology !== 'string' || !technology.trim()))
  ) {
    return 'Technologies must be an array of non-empty strings.';
  }

  return null;
}

function populateProject(project) {
  return project.populate([
    { path: 'owner', select: userProjection },
    { path: 'members', select: userProjection },
  ]);
}

export async function createProject(req, res, next) {
  const bodyError = validateBody(req.body, true);

  if (bodyError) {
    return res.status(400).json({ success: false, message: bodyError });
  }

  try {
    const project = await Project.create({
      name: req.body.name.trim(),
      description: req.body.description?.trim() ?? '',
      status: req.body.status ?? 'planning',
      technologies: req.body.technologies?.map((technology) => technology.trim()) ?? [],
      startDate: new Date(`${req.body.startDate}T00:00:00.000Z`),
      endDate: new Date(`${req.body.endDate}T00:00:00.000Z`),
      owner: req.user._id,
      members: [req.user._id],
    });

    await recordActivity({
      project: project._id,
      user: req.user._id,
      type: 'project_created',
      description: `${req.user.name} created project ${project.name}.`,
    });

    await populateProject(project);
    return res.status(201).json({ success: true, data: { project } });
  } catch (error) {
    return sendProjectError(error, res, next);
  }
}

export async function getProjects(req, res, next) {
  try {
    const projects = await Project.find({ members: req.user._id })
      .sort({ updatedAt: -1 })
      .populate('owner', userProjection)
      .populate('members', userProjection);

    return res.status(200).json({ success: true, data: { projects } });
  } catch (error) {
    return next(error);
  }
}

export async function getProject(req, res, next) {
  if (!mongoose.isObjectIdOrHexString(req.params.id)) {
    return res.status(400).json({ success: false, message: 'Invalid project ID.' });
  }

  try {
    const project = await Project.findOne({
      _id: req.params.id,
      members: req.user._id,
    })
      .populate('owner', userProjection)
      .populate('members', userProjection);

    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found.' });
    }

    return res.status(200).json({ success: true, data: { project } });
  } catch (error) {
    return next(error);
  }
}

export async function updateProject(req, res, next) {
  if (!mongoose.isObjectIdOrHexString(req.params.id)) {
    return res.status(400).json({ success: false, message: 'Invalid project ID.' });
  }

  const bodyError = validateBody(req.body);

  if (bodyError) {
    return res.status(400).json({ success: false, message: bodyError });
  }

  if (Object.keys(req.body).length === 0) {
    return res.status(400).json({ success: false, message: 'At least one project field is required.' });
  }

  try {
    const project = await Project.findById(req.params.id);

    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found.' });
    }

    if (!project.owner.equals(req.user._id)) {
      return res.status(403).json({ success: false, message: 'Only the project owner can update it.' });
    }

    const nextStartDate = 'startDate' in req.body ? new Date(`${req.body.startDate}T00:00:00.000Z`) : project.startDate;
    const nextEndDate = 'endDate' in req.body ? new Date(`${req.body.endDate}T00:00:00.000Z`) : project.endDate;
    if (nextStartDate && nextEndDate && nextEndDate < nextStartDate) {
      return res.status(400).json({ success: false, message: 'Project end date must be on or after its start date.' });
    }

    for (const field of writableFields) {
      if (field in req.body) {
        project[field] = Array.isArray(req.body[field])
          ? req.body[field].map((value) => value.trim())
          : typeof req.body[field] === 'string'
            ? req.body[field].trim()
            : req.body[field];
      }
    }

    await project.save();
    await populateProject(project);
    return res.status(200).json({ success: true, data: { project } });
  } catch (error) {
    return sendProjectError(error, res, next);
  }
}

export async function deleteProject(req, res, next) {
  if (!mongoose.isObjectIdOrHexString(req.params.id)) {
    return res.status(400).json({ success: false, message: 'Invalid project ID.' });
  }

  try {
    const project = await Project.findById(req.params.id);

    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found.' });
    }

    if (!project.owner.equals(req.user._id)) {
      return res.status(403).json({ success: false, message: 'Only the project owner can delete it.' });
    }

    await project.deleteOne();
    return res.status(200).json({ success: true, data: { id: project.id } });
  } catch (error) {
    return next(error);
  }
}

export async function addProjectMember(req, res, next) {
  if (!mongoose.isObjectIdOrHexString(req.params.id)) {
    return res.status(400).json({ success: false, message: 'Invalid project ID.' });
  }

  const { userId } = req.body ?? {};

  if (typeof userId !== 'string' || !mongoose.isObjectIdOrHexString(userId)) {
    return res.status(400).json({ success: false, message: 'A valid userId is required.' });
  }

  try {
    const project = await Project.findById(req.params.id);

    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found.' });
    }

    if (!project.owner.equals(req.user._id)) {
      return res.status(403).json({ success: false, message: 'Only the project owner can add members.' });
    }

    const member = await User.findById(userId).select('name email profilePicture role');

    if (!member) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    if (project.members.some((currentMember) => currentMember.equals(member._id))) {
      return res.status(409).json({ success: false, message: 'User is already a project member.' });
    }

    project.members.push(member._id);
    await project.save();
    await recordActivity({
      project: project._id,
      user: req.user._id,
      type: 'member_added',
      description: `${req.user.name} added ${member.name} to the project.`,
    });
    await createNotification({
      recipient: member._id,
      sender: req.user._id,
      type: 'project_member_added',
      message: `You were added to ${project.name}.`,
      project: project._id,
    });

    return res.status(201).json({
      success: true,
      data: {
        projectId: project.id,
        member: {
          id: member.id,
          name: member.name,
          email: member.email,
          profilePicture: member.profilePicture,
          role: member.role,
        },
      },
    });
  } catch (error) {
    return sendProjectError(error, res, next);
  }
}

export async function removeProjectMember(req, res, next) {
  const { id, userId } = req.params;

  if (!mongoose.isObjectIdOrHexString(id) || !mongoose.isObjectIdOrHexString(userId)) {
    return res.status(400).json({ success: false, message: 'Invalid project or user ID.' });
  }

  try {
    const project = await Project.findById(id);

    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found.' });
    }

    if (!project.owner.equals(req.user._id)) {
      return res.status(403).json({ success: false, message: 'Only the project owner can remove members.' });
    }

    if (project.owner.equals(userId)) {
      return res.status(409).json({ success: false, message: 'The project owner cannot be removed.' });
    }

    const memberIndex = project.members.findIndex((member) => member.equals(userId));

    if (memberIndex === -1) {
      return res.status(404).json({ success: false, message: 'Project member not found.' });
    }

    const [removedMemberId] = project.members.splice(memberIndex, 1);
    const member = await User.findById(removedMemberId).select('name email profilePicture role');
    await project.save();
    await recordActivity({
      project: project._id,
      user: req.user._id,
      type: 'member_removed',
      description: `${req.user.name} removed ${member?.name || 'a member'} from the project.`,
    });

    return res.status(200).json({
      success: true,
      data: {
        projectId: project.id,
        member: member
          ? {
              id: member.id,
              name: member.name,
              email: member.email,
              profilePicture: member.profilePicture,
              role: member.role,
            }
          : { id: removedMemberId.toString() },
      },
    });
  } catch (error) {
    return sendProjectError(error, res, next);
  }
}