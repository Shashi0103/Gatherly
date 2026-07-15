import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Home from './pages/Home';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Recordings from './pages/Recordings';
import MeetingRoom from './pages/MeetingRoom';

// Protected Route wrapper component
function ProtectedRoute({ children }) {
  const { currentUser, initializing } = useAuth();
  
  if (initializing) {
    return (
      <div className="min-h-screen bg-bg-primary flex flex-col items-center justify-center gap-3 text-textCol-secondary">
        <div className="w-8 h-8 border-4 border-blueAccent border-t-transparent rounded-full animate-spin"></div>
        <span className="text-xs font-semibold tracking-wider font-mono uppercase">Loading Gatherly session...</span>
      </div>
    );
  }

  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

export default function App() {
  return (
    <Router>
      <AuthProvider>
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />

          {/* Protected MERN Workspaces */}
          <Route 
            path="/dashboard" 
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/recordings" 
            element={
              <ProtectedRoute>
                <Recordings />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/meet/:link" 
            element={
              <ProtectedRoute>
                <MeetingRoom />
              </ProtectedRoute>
            } 
          />

          {/* Catch-all Fallback redirection */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </Router>
  );
}
