import api from '../../../lib/api.js';

export async function getTaskComments(taskId) {
  const { data } = await api.get(`/tasks/${taskId}/comments`);
  return data;
}

export async function createTaskComment(taskId, text) {
  const { data } = await api.post(`/tasks/${taskId}/comments`, { text });
  return data;
}
