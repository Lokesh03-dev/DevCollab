import axios from 'axios';
import { clearAuthToken, getAuthToken } from './authToken.js';

export const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';
export const SOCKET_ORIGIN = API_BASE_URL.startsWith('http') ? new URL(API_BASE_URL).origin : undefined;

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = getAuthToken();

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      clearAuthToken();
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('devcollab:unauthorized'));
      }
    }

    return Promise.reject(error);
  },
);

export default api;