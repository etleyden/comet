import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Box, Typography, Button, Container, Paper } from '@mui/material';
import ApiClient from '../../api/apiClient';

/**
 * The page users see when they first log in.
 */
export function HomePage() {
  const { user, logout } = useAuth();
  const [apiOutput, setApiOutput] = useState<string>('');

  const apiCheck = async () => {
    try {
      const response = await ApiClient.get('/health');
      const data = response as { status: string };
      setApiOutput(`API is healthy: ${data.status}`);
    } catch (error) {
      setApiOutput(`API health check failed: ${(error as Error).message}`);
    }
  };

  const authCheck = async () => {
    try {
      const response = await ApiClient.get('/api/posts');
      setApiOutput(`Auth check successful: ${JSON.stringify(response)}`);
    } catch (error) {
      setApiOutput(`Auth check failed: ${(error as Error).message}`);
    }
  };

  return (
    <Container maxWidth="md" sx={{ mt: 4 }}>
      <Paper sx={{ p: 4 }}>
        <Typography variant="h4" gutterBottom>
          Welcome, {user?.name}!
        </Typography>
        <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
          <Button onClick={apiCheck}>Check API Connection</Button>
          <Button onClick={authCheck}>Check Auth Endpoint</Button>
        </Box>
        {apiOutput && (
          <Paper sx={{ mt: 2, p: 2, bgcolor: 'grey.700' }}>
            <Typography variant="body2">{apiOutput}</Typography>
          </Paper>
        )}
        <Box sx={{ mb: 3, p: 2, bgcolor: 'success.main', borderRadius: 1 }}>
          <Typography variant="h6">✓ Logged in</Typography>
          <Typography variant="body2" color="text.secondary">
            {user?.email}
          </Typography>
          <Button size="small" sx={{ mt: 1 }} onClick={logout}>
            Logout
          </Button>
        </Box>
      </Paper>
    </Container>
  );
}
