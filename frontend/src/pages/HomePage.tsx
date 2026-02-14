import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Box, Typography, Button, Container, Paper } from '@mui/material';
import { healthApi, postsApi } from '../../api';

/**
 * The page users see when they first log in.
 */
export function HomePage() {
  const { user, logout } = useAuth();
  const [apiOutput, setApiOutput] = useState<string>('');

  const apiCheck = async () => {
    try {
      const data = await healthApi.check();
      setApiOutput(`API is healthy: ${data.status}`);
    } catch (error) {
      setApiOutput(`API health check failed: ${(error as Error).message}`);
    }
  };

  const authCheck = async () => {
    try {
      const response = await postsApi.list();
      setApiOutput(`Auth check successful: ${JSON.stringify(response)}`);
    } catch (error) {
      setApiOutput(`Auth check failed: ${(error as Error).message}`);
    }
  };

  return (
    <Container maxWidth="md" sx={{ mt: 4 }}>
      <Paper sx={{ p: 4 }}>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', mb: 2 }}>
          <Typography variant="h4">
            Welcome, {user?.name}!
          </Typography>
          <Typography variant="subtitle2" sx={{ color: "gray" }}>
            {user?.email}
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
          <Button onClick={apiCheck}>Check API Connection</Button>
          <Button onClick={authCheck}>Check Auth Endpoint</Button><Button variant="outlined" onClick={logout}>
            Logout
          </Button>
        </Box>
        {apiOutput && (
          <Paper sx={{ mt: 2, p: 2, bgcolor: 'grey.700' }}>
            <Typography variant="body2">{apiOutput}</Typography>
          </Paper>
        )}
        <Box>
          <Button href="/upload">Upload</Button>
        </Box>
      </Paper>
    </Container>
  );
}
