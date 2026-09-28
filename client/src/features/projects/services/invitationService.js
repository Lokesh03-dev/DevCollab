import api from '../../../lib/api.js';

export async function sendProjectInvitation(projectId, email) {
  const { data } = await api.post(`/projects/${projectId}/invitations`, { email });
  return data;
}

export async function getMyInvitations() {
  const { data } = await api.get('/invitations');
  return data;
}

export async function respondToInvitation(invitationId, response) {
  const { data } = await api.post(`/invitations/${invitationId}/${response}`);
  return data;
}
