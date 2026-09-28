import { createContext, useContext, useEffect, useState } from 'react';
import { clearAuthToken, getAuthToken, saveAuthToken } from '../../../lib/authToken.js';
import { getCurrentUser, loginUser, registerUser } from '../services/authService.js';
import { useToast } from '../../toasts/context/ToastContext.jsx';

const AuthContext = createContext(null);

function getErrorMessage(error) {
  return error.response?.data?.message || 'Something went wrong. Please try again.';
}

export function AuthProvider({ children }) {
  const { showToast } = useToast();
  const [token, setToken] = useState(getAuthToken);
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [authError, setAuthError] = useState('');

  useEffect(() => {
    let active = true;

    async function restoreSession() {
      const storedToken = getAuthToken();

      if (!storedToken) {
        setIsLoading(false);
        return;
      }

      try {
        const result = await getCurrentUser();
        if (active) {
          setToken(storedToken);
          setUser(result.user);
        }
      } catch (error) {
        clearAuthToken();
        if (active) {
          setToken(null);
          setUser(null);
          if (error.response?.status !== 401) {
            const message = getErrorMessage(error);
            setAuthError(message);
            showToast(message, 'error');
          }
        }
      } finally {
        if (active) setIsLoading(false);
      }
    }

    const handleUnauthorized = () => {
      setToken(null);
      setUser(null);
      setAuthError('Your session has expired. Please sign in again.');
    };

    window.addEventListener('devcollab:unauthorized', handleUnauthorized);
    restoreSession();

    return () => {
      active = false;
      window.removeEventListener('devcollab:unauthorized', handleUnauthorized);
    };
  }, []);

  async function establishSession(credentials) {
    const result = await loginUser(credentials);
    saveAuthToken(result.token);
    setToken(result.token);
    setUser(result.user);
    return result.user;
  }

  async function login(credentials) {
    setAuthError('');
    setIsSubmitting(true);

    try {
      return await establishSession(credentials);
    } catch (error) {
      const message = getErrorMessage(error);
      setAuthError(message);
      showToast(message, 'error');
      throw error;
    } finally {
      setIsSubmitting(false);
    }
  }

  async function register(credentials) {
    setAuthError('');
    setIsSubmitting(true);

    try {
      await registerUser(credentials);
      return await establishSession(credentials);
    } catch (error) {
      const message = getErrorMessage(error);
      setAuthError(message);
      showToast(message, 'error');
      throw error;
    } finally {
      setIsSubmitting(false);
    }
  }

  function logout() {
    clearAuthToken();
    setToken(null);
    setUser(null);
    setAuthError('');
  }

  const value = {
    user,
    token,
    isAuthenticated: Boolean(user && token),
    isLoading,
    isSubmitting,
    authError,
    clearAuthError: () => setAuthError(''),
    login,
    register,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider.');
  }

  return context;
}