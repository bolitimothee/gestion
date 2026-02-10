import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { SidebarProvider } from './context/SidebarContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import Login from './pages/Login';
import AccountExpired from './pages/AccountExpired';
import Dashboard from './pages/Dashboard';
import Stock from './pages/Stock';
import Sales from './pages/Sales';
import Finances from './pages/Finances';
import './styles/globals.css';
import './styles/components.css';

function App() {
  return (
    <Router>
      <AuthProvider>
        <SidebarProvider>
          <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/account-expired" element={<AccountExpired />} />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/stock"
            element={
              <ProtectedRoute>
                <Stock />
              </ProtectedRoute>
            }
          />
          <Route
            path="/sales"
            element={
              <ProtectedRoute>
                <Sales />
              </ProtectedRoute>
            }
          />
          <Route
            path="/finances"
            element={
              <ProtectedRoute>
                <Finances />
              </ProtectedRoute>
            }
          />
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </SidebarProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;
