import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Role } from 'shared';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { LandingPage } from './pages/LandingPage';
import { LoginPage } from './pages/LoginPage';
import { HomePage } from './pages/HomePage';
import UploadPage from './pages/UploadPage';
import UploadRecordPage from './pages/UploadRecordPage';
import ExperimentsPage from './pages/ExperimentsPage';
import AccountsPage from './pages/AccountsPage';
import AdminPage from './pages/AdminPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import ResetPasswordViaTokenPage from './pages/ResetPasswordViaTokenPage';
import SiteDrawer, { DRAWER_MARGIN } from './components/navigation/SiteDrawer';
import { Box } from '@mui/material';

function App() {
  return (
    <BrowserRouter>
      <Box sx={{ display: 'flex' }}>
        <SiteDrawer />
        <Box component="main" sx={{ flexGrow: 1, minWidth: 0, pt: `${DRAWER_MARGIN}px` }}>
          <Routes>
            {/* Public routes */}
            <Route
              path="/"
              element={
                <ProtectedRoute isPublic>
                  <LandingPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/login"
              element={
                <ProtectedRoute isPublic>
                  <LoginPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/reset-password/token"
              element={
                <ProtectedRoute isPublic>
                  <ResetPasswordViaTokenPage />
                </ProtectedRoute>
              }
            />

            {/* Protected routes */}
            <Route
              path="/reset-password"
              element={
                <ProtectedRoute>
                  <ResetPasswordPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/home"
              element={
                <ProtectedRoute>
                  <HomePage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/accounts"
              element={
                <ProtectedRoute>
                  <AccountsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/upload"
              element={
                <ProtectedRoute>
                  <UploadPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/upload-record/:id"
              element={
                <ProtectedRoute>
                  <UploadRecordPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/experiments"
              element={
                <ProtectedRoute>
                  <ExperimentsPage />
                </ProtectedRoute>
              }
            />

            {/* Admin-only routes */}
            <Route
              path="/admin"
              element={
                <ProtectedRoute requiredRole={Role.ADMIN}>
                  <AdminPage />
                </ProtectedRoute>
              }
            />

            {/* Catch-all redirect */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Box>
      </Box>
    </BrowserRouter>
  );
}

export default App;
