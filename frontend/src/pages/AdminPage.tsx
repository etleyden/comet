import { Box, Typography } from '@mui/material';
import ForgotPassword from '../components/auth/ForgotPassword';

export default function AdminPage() {
  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Admin Dashboard
      </Typography>
      <Typography variant="body1" color="text.secondary">
        Site-wide configuration and analytics will appear here.
      </Typography>
      <ForgotPassword />
    </Box>
  );
}
