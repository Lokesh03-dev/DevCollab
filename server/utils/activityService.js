import Activity from '../models/Activity.js';

export async function recordActivity({ project, user, type, description, relatedTask = null, relatedFile = null }) {
  return Activity.create({ project, user, type, description, relatedTask, relatedFile });
}