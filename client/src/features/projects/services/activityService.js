import api from '../../../lib/api.js';

export async function getProjectActivity(projectId) {
  const { data } = await api.get(`/projects/${projectId}/activity`);
  return data;
}