import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import ApiManagement from './pages/ApiManagement';
import KeyManagement from './pages/KeyManagement';
import Logs from './pages/Logs';
import Settings from './pages/Settings';
import EndpointExplorer from './pages/EndpointExplorer';
import { Toaster } from 'react-hot-toast';

const App: React.FC = () => {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/" element={<div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', fontSize: '3rem', fontFamily: 'monospace', color: 'white', backgroundColor: 'black' }}>lund lele z4x ka</div>} />
          <Route path="/shadowphantomlogin" element={<Login />} />
          
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Dashboard />} />
            <Route path="apis" element={<ApiManagement />} />
            <Route path="keys" element={<KeyManagement />} />
            <Route path="explorer" element={<EndpointExplorer />} />
            <Route path="logs" element={<Logs />} />
            <Route path="settings" element={<Settings />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
      
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: 'var(--bg-elevated)',
            color: 'var(--text-primary)',
            border: '1px solid var(--border-default)',
            backdropFilter: 'blur(10px)',
            borderRadius: 'var(--radius-md)',
          },
          success: {
            iconTheme: {
              primary: 'var(--success-500)',
              secondary: 'var(--bg-base)',
            },
          },
          error: {
            iconTheme: {
              primary: 'var(--danger-500)',
              secondary: 'var(--bg-base)',
            },
          },
        }}
      />
    </AuthProvider>
  );
};

export default App;
