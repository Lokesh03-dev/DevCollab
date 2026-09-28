const tokenKey = 'devcollab_access_token';

export function getAuthToken() {
  return typeof window === 'undefined' ? null : window.sessionStorage.getItem(tokenKey);
}

export function saveAuthToken(token) {
  window.sessionStorage.setItem(tokenKey, token);
}

export function clearAuthToken() {
  if (typeof window !== 'undefined') {
    window.sessionStorage.removeItem(tokenKey);
  }
}