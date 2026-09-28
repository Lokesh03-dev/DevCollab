import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './app/App.jsx';
import AppErrorBoundary from './components/ui/AppErrorBoundary.jsx';
import { AuthProvider } from './features/auth/context/AuthContext.jsx';
import { ThemeProvider } from './features/theme/context/ThemeContext.jsx';
import { ToastProvider } from './features/toasts/context/ToastContext.jsx';
import './styles/index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AppErrorBoundary>
      <BrowserRouter>
        <ThemeProvider>
          <ToastProvider>
            <AuthProvider>
              <App />
            </AuthProvider>
          </ToastProvider>
        </ThemeProvider>
      </BrowserRouter>
    </AppErrorBoundary>
  </React.StrictMode>,
);