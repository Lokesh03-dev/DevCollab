import api from '../../../lib/api.js';

export async function searchPeople(query) {
  const { data } = await api.get('/users', { params: { q: query } });
  return data;
}

export async function getDirectConversations() {
  const { data } = await api.get('/messages');
  return data;
}

export async function getDirectMessages(userId) {
  const { data } = await api.get(`/messages/${userId}`);
  return data;
}
