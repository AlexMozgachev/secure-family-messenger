import { useState, useEffect } from "react";
import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import axios from "axios";
import Installer from "./pages/Installer";
import AdminLogin from "./pages/AdminLogin";
import AdminDashboard from "./pages/AdminDashboard";
import { Toaster } from "sonner";

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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <div className="App">
      <BrowserRouter>
        <Routes>
          <Route
            path="/"
            element={
              !isInstalled ? (
                <Installer onComplete={handleInstallComplete} />
              ) : !isAuthenticated ? (
                <Navigate to="/login" replace />
              ) : (
                <Navigate to="/admin" replace />
              )
            }
          />
          <Route
            path="/login"
            element={
              !isInstalled ? (
                <Navigate to="/" replace />
              ) : isAuthenticated ? (
                <Navigate to="/admin" replace />
              ) : (
                <AdminLogin onLogin={handleLogin} />
              )
            }
          />
          <Route
            path="/admin/*"
            element={
              !isInstalled ? (
                <Navigate to="/" replace />
              ) : !isAuthenticated ? (
                <Navigate to="/login" replace />
              ) : (
                <AdminDashboard onLogout={handleLogout} />
              )
            }
          />
        </Routes>
      </BrowserRouter>
    </div>
  );
}

export default App;
