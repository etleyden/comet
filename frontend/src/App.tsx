import Login from './components/Login';
import { useAuth } from './context/AuthContext';
import { Box, Typography, Button } from '@mui/material';

function App() {
  const { user, isAuthenticated, isLoading, logout } = useAuth();

  if (isLoading) {
    return <Typography>Loading...</Typography>;
  }

  return (
    <Box sx={{ p: 3 }}>
      {isAuthenticated && user ? (
        <Box sx={{ mb: 3, p: 2, bgcolor: 'success.light', borderRadius: 1 }}>
          <Typography variant="h6">✓ Logged in as {user.name}</Typography>
          <Typography variant="body2" color="text.secondary">{user.email}</Typography>
          <Button variant="outlined" size="small" sx={{ mt: 1 }} onClick={logout}>
            Logout
          </Button>
        </Box>
      ) : (
        <Box sx={{ mb: 3, p: 2, bgcolor: 'warning.light', borderRadius: 1 }}>
          <Typography variant="body1">Not authenticated</Typography>
        </Box>
      )}
      <Login />
    </Box>
  )
}

export default App
