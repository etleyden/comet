import TransactionTable from '../components/transactionTable/TransactionTable';
import { useAuth } from '../context/AuthContext';
import { Box, Typography, Container, Paper } from '@mui/material';

/**
 * The page users see when they first log in.
 */
export function HomePage() {
  const { user } = useAuth();

  return (
    <Container maxWidth="lg" sx={{ mt: 4 }}>
      <Paper sx={{ p: 4 }}>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', mb: 2 }}>
          <Typography variant="h4">
            Welcome, {user?.name}!
          </Typography>
        </Box>
        <TransactionTable />
      </Paper>
    </Container>
  );
}
