import api from '../../../lib/api.js';

export async function createProject(payload) {
  const { data } = await api.post('/projects', payload);
  return data;
}

export async function getProjects() {
  const { data } = await api.get('/projects');
  return data;
}

export async function getProject(projectId) {
  const { data } = await api.get(`/projects/${projectId}`);
  return data;
}

export async function updateProject(projectId, payload) {
  const { data } = await api.put(`/projects/${projectId}`, payload);
  return data;
}

export async function deleteProject(projectId) {
  const { data } = await api.delete(`/projects/${projectId}`);
  return data;
}

export async function addProjectMember(projectId, userId) {
  const { data } = await api.post(`/projects/${projectId}/members`, { userId });
  return data;
}

export async function removeProjectMember(projectId, userId) {
  const { data } = await api.delete(`/projects/${projectId}/members/${userId}`);
  return data;
}