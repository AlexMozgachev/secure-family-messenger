import { useState, useEffect } from "react";
import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import axios from "axios";
import Installer from "./pages/Installer";
import AdminDashboard from "./pages/AdminDashboard";
import { Toaster } from "sonner";
import UserLogin from './pages/UserLogin';
import UserChat from './pages/UserChat';
import ChatRoom from './pages/ChatRoom';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Axios interceptor for auth
axios.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

function App() {
  const [isInstalled, setIsInstalled] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkInstallStatus();
    checkAuth();
  }, []);

  const checkInstallStatus = async () => {
    try {
      const response = await axios.get(`${API}/install/status`);
      setIsInstalled(response.data.installed);
    } catch (error) {
      console.error('Error checking install status:', error);
      setIsInstalled(false);
    } finally {
      setLoading(false);
    }
  };

  const checkAuth = () => {
    const token = localStorage.getItem('token');
    if (token) {
      setIsAuthenticated(true);
    }
  };

  const handleInstallComplete = () => {
    setIsInstalled(true);
  };

  const handleLogin = () => {
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setIsAuthenticated(false);
  };

  const isUserAdmin = () => {
    try {
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      return user.is_admin === true;
    } catch (e) {
      return false;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  if (!isInstalled) {
    return (
      <div className="App">
        <Toaster position="top-right" richColors />
        <Installer onComplete={handleInstallComplete} />
      </div>
    );
  }

  return (
    <div className="App">
      <Toaster position="top-right" richColors />
      <BrowserRouter>
        <Routes>
          <Route 
            path="/login" 
            element={
              isAuthenticated ? (
                <Navigate to={isUserAdmin() ? "/admin" : "/chat"} replace />
              ) : (
                <UserLogin onLogin={handleLogin} />
              )
            } 
          />
<Route path="/chat/room/:roomId/:roomName" element={<ChatRoom />} />

          <Route 
            path="/chat" 
            element={
              isAuthenticated ? (
                <UserChat />
              ) : (
                <Navigate to="/login" replace />
              )
            } 
          />

          <Route 
            path="/admin/*" 
            element={
              isAuthenticated && isUserAdmin() ? (
                <AdminDashboard onLogout={handleLogout} />
              ) : (
                <Navigate to="/login" replace />
              )
            } 
          />

          <Route 
            path="/" 
            element={
              isAuthenticated ? (
                <Navigate to={isUserAdmin() ? "/admin" : "/chat"} replace />
              ) : (
                <Navigate to="/login" replace />
              )
            } 
          />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </div>
  );
}

export default App;
