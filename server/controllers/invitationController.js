import mongoose from 'mongoose';
import Invitation from '../models/Invitation.js';
import Project from '../models/Project.js';
import User from '../models/User.js';
import { recordActivity } from '../utils/activityService.js';
import { createNotification } from '../utils/notificationService.js';

const invitationPopulation = [
  { path: 'project', select: 'name status' },
  { path: 'inviter', select: 'name email profilePicture' },
  { path: 'recipient', select: 'name email' },
];

export async function createProjectInvitation(req, res, next) {
  if (!mongoose.isObjectIdOrHexString(req.params.id)) {
    return res.status(400).json({ success: false, message: 'Invalid project ID.' });
  }

  const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ success: false, message: 'A valid email address is required.' });
  }

  try {
    const project = await Project.findById(req.params.id);
    if (!project) return res.status(404).json({ success: false, message: 'Project not found.' });
    if (!project.owner.equals(req.user._id)) {
      return res.status(403).json({ success: false, message: 'Only the project owner can invite members.' });
    }

    const recipient = await User.findOne({ email }).select('name email profilePicture role');
    if (!recipient) return res.status(404).json({ success: false, message: 'No DevCollab account uses that email yet.' });
    if (project.members.some((memberId) => memberId.equals(recipient._id))) {
      return res.status(409).json({ success: false, message: 'This person is already a project member.' });
    }

    const existingInvitation = await Invitation.exists({ project: project._id, recipient: recipient._id, status: 'pending' });
    if (existingInvitation) {
      return res.status(409).json({ success: false, message: 'A pending invitation already exists for this person.' });
    }

    const invitation = await Invitation.create({
      project: project._id,
      inviter: req.user._id,
      recipient: recipient._id,
      email,
    });
    await createNotification({
      recipient: recipient._id,
      sender: req.user._id,
      type: 'project_invitation',
      message: `${req.user.name} invited you to join ${project.name}.`,
      project: project._id,
    });

    await invitation.populate(invitationPopulation);
    return res.status(201).json({ success: true, data: { invitation } });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ success: false, message: 'A pending invitation already exists for this person.' });
    }
    return next(error);
  }
}

export async function getMyInvitations(req, res, next) {
  try {
    const invitations = await Invitation.find({ recipient: req.user._id, status: 'pending' })
      .sort({ createdAt: -1 })
      .populate(invitationPopulation);
    return res.status(200).json({ success: true, data: { invitations } });
  } catch (error) {
    return next(error);
  }
}

async function respondToInvitation(req, res, next, status) {
  if (!mongoose.isObjectIdOrHexString(req.params.id)) {
    return res.status(400).json({ success: false, message: 'Invalid invitation ID.' });
  }

  try {
    const invitation = await Invitation.findOne({
      _id: req.params.id,
      recipient: req.user._id,
      status: 'pending',
    }).populate('project', 'name owner members');

    if (!invitation) return res.status(404).json({ success: false, message: 'Pending invitation not found.' });
    if (!invitation.project) return res.status(404).json({ success: false, message: 'The invited project no longer exists.' });

    if (status === 'accepted') {
      if (!invitation.project.members.some((memberId) => memberId.equals(req.user._id))) {
        invitation.project.members.push(req.user._id);
        await invitation.project.save();
        await recordActivity({
          project: invitation.project._id,
          user: req.user._id,
          type: 'member_added',
          description: `${req.user.name} joined the project.`,
        });
        await createNotification({
          recipient: invitation.inviter,
          sender: req.user._id,
          type: 'project_member_added',
          message: `${req.user.name} accepted your invitation to ${invitation.project.name}.`,
          project: invitation.project._id,
        });
      }
    }

    invitation.status = status;
    await invitation.save();
    return res.status(200).json({
      success: true,
      data: { invitation: { id: invitation.id, status, projectId: invitation.project.id } },
    });
  } catch (error) {
    return next(error);
  }
}

export function acceptInvitation(req, res, next) {
  return respondToInvitation(req, res, next, 'accepted');
}

export function rejectInvitation(req, res, next) {
  return respondToInvitation(req, res, next, 'rejected');
}
