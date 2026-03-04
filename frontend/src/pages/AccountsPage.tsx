import { useState, useEffect, useCallback } from 'react';
import {
    Container,
    Paper,
    Typography,
    Box,
    Button, Alert,
    CircularProgress,
    Divider
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import type { Account } from 'shared';
import { accountsApi } from '../../api';
import AccountCreation from '../components/accounts/AccountCreation';
import AccountCard from '../components/accounts/AccountCard';

/**
 * Accounts management page — lists all user accounts in readonly sections,
 * with Edit and Delete actions for each.
 */
export default function AccountsPage() {
    const [accounts, setAccounts] = useState<Account[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [showCreate, setShowCreate] = useState(false);

    const loadAccounts = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await accountsApi.getAccounts();
            if (res.success) {
                setAccounts(res.data);
            } else {
                setError(res.error);
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load accounts');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadAccounts();
    }, [loadAccounts]);

    return (
        <Container maxWidth="md" sx={{ mt: 4 }}>
            <Paper sx={{ p: 4 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Typography variant="h4">Accounts</Typography>
                    {!showCreate && (
                        <Button startIcon={<AddIcon />} onClick={() => setShowCreate(true)}>
                            Add Account
                        </Button>
                    )}
                </Box>

                <Divider sx={{ mb: 3 }} />

                {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

                {showCreate && (
                    <AccountCreation
                        onCreated={() => { setShowCreate(false); loadAccounts(); }}
                        onCancel={() => setShowCreate(false)}
                    />
                )}

                {loading ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                        <CircularProgress />
                    </Box>
                ) : accounts.length === 0 ? (
                    <Typography color="text.secondary" sx={{ py: 4, textAlign: 'center' }}>
                        No accounts yet. Click "Add Account" to get started.
                    </Typography>
                ) : (
                    accounts.map((account) => (
                        <AccountCard
                            key={account.id}
                            account={account}
                            onSaved={loadAccounts}
                            onDeleted={loadAccounts}
                        />
                    ))
                )}
            </Paper>
        </Container>
    );
}
