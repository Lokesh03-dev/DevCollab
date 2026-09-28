import mongoose from 'mongoose';
import CodeFile from '../models/CodeFile.js';
import Project from '../models/Project.js';
import { recordActivity } from '../utils/activityService.js';

const writableFields = new Set(['fileName', 'path', 'language', 'content']);
const userProjection = 'name email profilePicture';

function validateFileBody(body, requireAll = false) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return 'Request body must be a JSON object.';
  }

  if (Object.keys(body).some((field) => !writableFields.has(field))) {
    return 'Request contains unsupported file fields.';
  }

  for (const field of ['fileName', 'path', 'language']) {
    if ((requireAll || field in body) && (typeof body[field] !== 'string' || !body[field].trim())) {
      return `${field} is required.`;
    }
  }

  if ((requireAll || 'content' in body) && typeof body.content !== 'string') {
    return 'content must be a string.';
  }

  if ('fileName' in body && (body.fileName.length > 120 || /[\\/]/.test(body.fileName))) {
    return 'fileName must be a filename, not a path.';
  }

  if ('path' in body) {
    const segments = body.path.split('/');
    if (
      body.path.length > 500 ||
      body.path.startsWith('/') ||
      body.path.includes('\\') ||
      segments.some((segment) => !segment || segment === '.' || segment === '..') ||
      ('fileName' in body && segments.at(-1) !== body.fileName.trim())
    ) {
      return 'path must be a safe, relative path ending with fileName.';
    }
  }

  if ('language' in body && !/^[\w+#.-]{1,50}$/.test(body.language)) {
    return 'language contains unsupported characters.';
  }

  if ('content' in body && body.content.length > 1000000) {
    return 'content must be 1,000,000 characters or fewer.';
  }

  return null;
}

async function findProjectForMember(projectId, userId) {
  const project = await Project.findById(projectId);

  if (!project) return { error: { status: 404, message: 'Project not found.' } };
  if (!project.members.some((memberId) => memberId.equals(userId))) {
    return { error: { status: 403, message: 'You are not a member of this project.' } };
  }

  return { project };
}

async function findFileForMember(fileId, userId) {
  const codeFile = await CodeFile.findById(fileId);

  if (!codeFile) return { error: { status: 404, message: 'Code file not found.' } };

  const access = await findProjectForMember(codeFile.project, userId);
  return access.error ? access : { codeFile, project: access.project };
}

function sendFileError(error, res, next) {
  if (error.code === 11000) {
    return res.status(409).json({ success: false, message: 'A file already exists at this project path.' });
  }
  if (error.name === 'ValidationError' || error.name === 'CastError') {
    return res.status(400).json({ success: false, message: error.message });
  }
  return next(error);
}

export async function createCodeFile(req, res, next) {
  if (!mongoose.isObjectIdOrHexString(req.params.projectId)) {
    return res.status(400).json({ success: false, message: 'Invalid project ID.' });
  }

  const bodyError = validateFileBody(req.body, true);
  if (bodyError) return res.status(400).json({ success: false, message: bodyError });

  try {
    const access = await findProjectForMember(req.params.projectId, req.user._id);
    if (access.error) return res.status(access.error.status).json({ success: false, message: access.error.message });

    const codeFile = await CodeFile.create({
      ...req.body,
      fileName: req.body.fileName.trim(),
      path: req.body.path.trim(),
      language: req.body.language.trim(),
      project: access.project._id,
      createdBy: req.user._id,
      updatedBy: req.user._id,
    });
    await recordActivity({
      project: access.project._id,
      user: req.user._id,
      type: 'code_file_created',
      description: `${req.user.name} created ${codeFile.path}.`,
      relatedFile: codeFile._id,
    });
    await codeFile.populate([
      { path: 'createdBy', select: userProjection },
      { path: 'updatedBy', select: userProjection },
    ]);

    return res.status(201).json({ success: true, data: { codeFile } });
  } catch (error) {
    return sendFileError(error, res, next);
  }
}

export async function getProjectCodeFiles(req, res, next) {
  if (!mongoose.isObjectIdOrHexString(req.params.projectId)) {
    return res.status(400).json({ success: false, message: 'Invalid project ID.' });
  }

  try {
    const access = await findProjectForMember(req.params.projectId, req.user._id);
    if (access.error) return res.status(access.error.status).json({ success: false, message: access.error.message });

    const codeFiles = await CodeFile.find({ project: access.project._id })
      .sort({ path: 1 })
      .populate('createdBy', userProjection)
      .populate('updatedBy', userProjection);

    return res.status(200).json({ success: true, data: { codeFiles } });
  } catch (error) {
    return next(error);
  }
}

export async function getCodeFile(req, res, next) {
  if (!mongoose.isObjectIdOrHexString(req.params.fileId)) {
    return res.status(400).json({ success: false, message: 'Invalid file ID.' });
  }

  try {
    const result = await findFileForMember(req.params.fileId, req.user._id);
    if (result.error) return res.status(result.error.status).json({ success: false, message: result.error.message });
    await result.codeFile.populate([
      { path: 'createdBy', select: userProjection },
      { path: 'updatedBy', select: userProjection },
    ]);
    return res.status(200).json({ success: true, data: { codeFile: result.codeFile } });
  } catch (error) {
    return next(error);
  }
}

export async function updateCodeFile(req, res, next) {
  if (!mongoose.isObjectIdOrHexString(req.params.fileId)) {
    return res.status(400).json({ success: false, message: 'Invalid file ID.' });
  }

  const bodyError = validateFileBody(req.body);
  if (bodyError) return res.status(400).json({ success: false, message: bodyError });
  if (Object.keys(req.body).length === 0) return res.status(400).json({ success: false, message: 'At least one file field is required.' });

  try {
    const result = await findFileForMember(req.params.fileId, req.user._id);
    if (result.error) return res.status(result.error.status).json({ success: false, message: result.error.message });

    const nextFileName = req.body.fileName?.trim() ?? result.codeFile.fileName;
    const nextPath = req.body.path?.trim() ?? result.codeFile.path;
    if (nextPath.split('/').at(-1) !== nextFileName) {
      return res.status(400).json({ success: false, message: 'path must end with fileName.' });
    }

    for (const field of writableFields) {
      if (field in req.body) result.codeFile[field] = typeof req.body[field] === 'string' ? req.body[field].trim() : req.body[field];
    }
    result.codeFile.updatedBy = req.user._id;
    await result.codeFile.save();
    await recordActivity({
      project: result.project._id,
      user: req.user._id,
      type: 'code_file_updated',
      description: `${req.user.name} updated ${result.codeFile.path}.`,
      relatedFile: result.codeFile._id,
    });
    await result.codeFile.populate([
      { path: 'createdBy', select: userProjection },
      { path: 'updatedBy', select: userProjection },
    ]);

    return res.status(200).json({ success: true, data: { codeFile: result.codeFile } });
  } catch (error) {
    return sendFileError(error, res, next);
  }
}

export async function deleteCodeFile(req, res, next) {
  if (!mongoose.isObjectIdOrHexString(req.params.fileId)) {
    return res.status(400).json({ success: false, message: 'Invalid file ID.' });
  }

  try {
    const result = await findFileForMember(req.params.fileId, req.user._id);
    if (result.error) return res.status(result.error.status).json({ success: false, message: result.error.message });
    const fileName = result.codeFile.path;
    const projectId = result.project._id;
    await result.codeFile.deleteOne();
    await recordActivity({
      project: projectId,
      user: req.user._id,
      type: 'code_file_deleted',
      description: `${req.user.name} deleted ${fileName}.`,
    });
    return res.status(200).json({ success: true, data: { id: result.codeFile.id } });
  } catch (error) {
    return next(error);
  }
}