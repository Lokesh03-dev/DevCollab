import api from '../../../lib/api.js';

export async function getProjectMessages(projectId) {
  const { data } = await api.get(`/projects/${projectId}/messages`);
  return data;
}