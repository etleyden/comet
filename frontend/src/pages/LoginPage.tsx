import { Container, Box, Typography, Paper } from '@mui/material';
import Login from '../components/Login';

export function LoginPage() {
  return (
    <Container maxWidth="sm" sx={{ mt: 4 }}>
      <Box sx={{ mb: 4, textAlign: 'center' }}>
        <Typography variant="h3" gutterBottom>
          Welcome
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Sign in to your account or create a new one
        </Typography>
      </Box>

      <Paper sx={{ p: 4 }}>
        <Login />
      </Paper>
    </Container>
  );
}
