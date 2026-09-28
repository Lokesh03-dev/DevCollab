import mongoose from 'mongoose';
import Project from '../models/Project.js';
import { getRepositorySummary, GitHubServiceError } from '../services/githubService.js';
import { recordActivity } from '../utils/activityService.js';

async function findProjectForMember(projectId, userId) {
  if (!mongoose.isObjectIdOrHexString(projectId)) {
    return { response: { status: 400, message: 'Invalid project ID.' } };
  }

  const project = await Project.findById(projectId);
  if (!project) return { response: { status: 404, message: 'Project not found.' } };
  if (!project.members.some((member) => member.equals(userId))) {
    return { response: { status: 403, message: 'You are not a member of this project.' } };
  }

  return { project };
}

function sendGitHubError(error, res, next) {
  if (error instanceof GitHubServiceError) {
    return res.status(error.status).json({ success: false, message: error.message });
  }
  return next(error);
}

export async function getProjectGitHub(req, res, next) {
  try {
    const result = await findProjectForMember(req.params.id, req.user._id);
    if (result.response) {
      return res.status(result.response.status).json({ success: false, message: result.response.message });
    }

    if (!result.project.githubRepository) {
      return res.status(200).json({ success: true, data: { repository: null, commits: [] } });
    }

    const summary = await getRepositorySummary(result.project.githubRepository);
    return res.status(200).json({ success: true, data: summary });
  } catch (error) {
    return sendGitHubError(error, res, next);
  }
}

export async function connectProjectGitHub(req, res, next) {
  try {
    const result = await findProjectForMember(req.params.id, req.user._id);
    if (result.response) {
      return res.status(result.response.status).json({ success: false, message: result.response.message });
    }

    if (!result.project.owner.equals(req.user._id)) {
      return res.status(403).json({ success: false, message: 'Only the project owner can connect a repository.' });
    }

    const { repository } = req.body ?? {};
    const summary = await getRepositorySummary(repository);
    result.project.githubRepository = summary.repository.fullName;
    await result.project.save();
    await recordActivity({
      project: result.project._id,
      user: req.user._id,
      type: 'github_connected',
      description: `${req.user.name} connected GitHub repository ${summary.repository.fullName}.`,
    });

    return res.status(200).json({ success: true, data: summary });
  } catch (error) {
    return sendGitHubError(error, res, next);
  }
}