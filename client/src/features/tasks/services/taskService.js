import api from '../../../lib/api.js';

export async function createTask(projectId, payload) {
  const { data } = await api.post(`/projects/${projectId}/tasks`, payload);
  return data;
}

export async function getProjectTasks(projectId) {
  const { data } = await api.get(`/projects/${projectId}/tasks`);
  return data;
}

export async function updateTask(taskId, payload) {
  const { data } = await api.put(`/tasks/${taskId}`, payload);
  return data;
}

export async function deleteTask(taskId) {
  const { data } = await api.delete(`/tasks/${taskId}`);
  return data;
}