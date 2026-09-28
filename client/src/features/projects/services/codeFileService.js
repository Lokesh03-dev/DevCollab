import api from '../../../lib/api.js';

export async function createCodeFile(projectId, payload) {
  const { data } = await api.post(`/projects/${projectId}/code-files`, payload);
  return data;
}

export async function getProjectCodeFiles(projectId) {
  const { data } = await api.get(`/projects/${projectId}/code-files`);
  return data;
}

export async function getCodeFile(fileId) {
  const { data } = await api.get(`/code-files/${fileId}`);
  return data;
}

export async function updateCodeFile(fileId, payload) {
  const { data } = await api.put(`/code-files/${fileId}`, payload);
  return data;
}

export async function deleteCodeFile(fileId) {
  const { data } = await api.delete(`/code-files/${fileId}`);
  return data;
}