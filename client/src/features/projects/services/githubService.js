import api from '../../../lib/api.js';

export async function getProjectGitHub(projectId) {
  const { data } = await api.get(`/projects/${projectId}/github`);
  return data;
}

export async function connectProjectGitHub(projectId, repository) {
  const { data } = await api.put(`/projects/${projectId}/github`, { repository });
  return data;
}