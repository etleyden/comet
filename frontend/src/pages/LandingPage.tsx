import { Container, Box, Typography, Button, Paper } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useEffect } from 'react';

/**
 * The main landing page. Users are redirected here if not authenticated.
 * @returns
 */
export function LandingPage() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  // Redirect to /home if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/home');
    }
  }, [isAuthenticated, navigate]);

  return (
    <Container maxWidth="md" sx={{ mt: 8 }}>
      <Paper sx={{ p: 6, textAlign: 'center' }}>
        <Typography variant="h2" gutterBottom>
          Welcome to Our App
        </Typography>
        <Typography variant="h6" color="text.secondary" sx={{ mb: 4 }}>
          Get started by logging in or creating a new account
        </Typography>
        <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
          <Button variant="contained" size="large" onClick={() => navigate('/login')}>
            Get Started
          </Button>
        </Box>
      </Paper>
    </Container>
  );
}
