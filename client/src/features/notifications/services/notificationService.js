import api from '../../../lib/api.js';

export async function getNotifications() {
  const { data } = await api.get('/notifications');
  return data;
}

export async function markNotificationRead(notificationId) {
  const { data } = await api.put(`/notifications/${notificationId}/read`);
  return data;
}

export async function markAllNotificationsRead() {
  const { data } = await api.put('/notifications/read-all');
  return data;
}