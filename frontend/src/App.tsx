import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { LandingPage } from './pages/LandingPage';
import { LoginPage } from './pages/LoginPage';
import { HomePage } from './pages/HomePage';
import UploadPage from './pages/UploadPage';
import ExperimentsPage from './pages/ExperimentsPage';
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

            {/* Protected routes */}
            <Route
              path="/home"
              element={
                <ProtectedRoute>
                  <HomePage />
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
              path="/experiments"
              element={
                <ProtectedRoute>
                  <ExperimentsPage />
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
