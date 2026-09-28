import mongoose from 'mongoose';
import Activity from '../models/Activity.js';
import Project from '../models/Project.js';

export async function getProjectActivity(req, res, next) {
  const { projectId } = req.params;

  if (!mongoose.isObjectIdOrHexString(projectId)) {
    return res.status(400).json({ success: false, message: 'Invalid project ID.' });
  }

  try {
    const project = await Project.findById(projectId).select('_id members');

    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found.' });
    }

    if (!project.members.some((member) => member.equals(req.user._id))) {
      return res.status(403).json({ success: false, message: 'You are not a member of this project.' });
    }

    const activities = await Activity.find({ project: project._id })
      .sort({ createdAt: -1 })
      .limit(100)
      .populate('user', 'name profilePicture')
      .populate('relatedTask', 'title status')
      .populate('relatedFile', 'fileName path');

    return res.status(200).json({ success: true, data: { activities } });
  } catch (error) {
    return next(error);
  }
}