import React, { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SidebarProvider } from './context/SidebarContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import ErrorBoundary from './components/ErrorBoundary';
import LoadingSpinner from './components/LoadingSpinner';
import Toast from './components/Toast';
const Login = lazy(() => import('./pages/Login'));
const Register = lazy(() => import('./pages/Register'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Stock = lazy(() => import('./pages/Stock'));
const Sales = lazy(() => import('./pages/Sales'));
const Finances = lazy(() => import('./pages/Finances'));
const Orders = lazy(() => import('./pages/Orders'));
const Clients = lazy(() => import('./pages/Clients'));

function AppContent() {
  const { loading, isAuthReady } = useAuth();

  // Afficher le spinner pendant le chargement initial de l'authentification
  if (loading || !isAuthReady) {
    return <LoadingSpinner />;
  }

  return (
    <SidebarProvider>
      <Suspense fallback={<LoadingSpinner />}>
        <Routes>
          <Route path="/login" element={<Login />} />
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
          <Route
            path="/orders"
            element={
              <ProtectedRoute>
                <Orders />
              </ProtectedRoute>
            }
          />
          <Route
            path="/clients"
            element={
              <ProtectedRoute>
                <Clients />
              </ProtectedRoute>
            }
          />
          <Route path="/register" element={<Register />} />
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </Suspense>
    </SidebarProvider>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <Router>
          <AppContent />
        </Router>
        <Toast />
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;