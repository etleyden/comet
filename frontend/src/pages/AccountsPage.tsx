import { useState, useEffect, useCallback } from 'react';
import {
    Container,
    Paper,
    Typography,
    Box,
    Button,
    TextField,
    IconButton,
    Alert,
    CircularProgress,
    Divider,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogContentText,
    DialogActions,
    Collapse,
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import SaveIcon from '@mui/icons-material/Save';
import CancelIcon from '@mui/icons-material/Cancel';
import AddIcon from '@mui/icons-material/Add';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import type { Account } from 'shared';
import { accountsApi } from '../../api';
import AccountCreation from '../components/accounts/AccountCreation';

interface AccountFormState {
    name: string;
    institution: string;
    account: string;
    routing: string;
}

/**
 * A single account card — readonly by default, editable after clicking Edit.
 */
function AccountCard({
    account,
    onSaved,
    onDeleted,
}: {
    account: Account;
    onSaved: () => void;
    onDeleted: () => void;
}) {
    const [editing, setEditing] = useState(false);
    const [form, setForm] = useState<AccountFormState>({
        name: account.name,
        institution: account.institution ?? '',
        account: account.account,
        routing: account.routing,
    });
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [confirmDelete, setConfirmDelete] = useState(false);
    const [expanded, setExpanded] = useState(true);
    const [hovered, setHovered] = useState(false);

    // Sync form when the parent data refreshes
    useEffect(() => {
        setForm({
            name: account.name,
            institution: account.institution ?? '',
            account: account.account,
            routing: account.routing,
        });
    }, [account]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleCancel = () => {
        setEditing(false);
        setError(null);
        setForm({
            name: account.name,
            institution: account.institution ?? '',
            account: account.account,
            routing: account.routing,
        });
    };

    const handleSave = async () => {
        setSaving(true);
        setError(null);
        try {
            const res = await accountsApi.updateAccount(account.id, {
                name: form.name,
                institution: form.institution || undefined,
                account: form.account,
                routing: form.routing,
            });
            if (res.success) {
                setEditing(false);
                onSaved();
            } else {
                setError(res.error);
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to save');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        setConfirmDelete(false);
        setSaving(true);
        setError(null);
        try {
            const res = await accountsApi.deleteAccount(account.id);
            if (res.success) {
                onDeleted();
            } else {
                setError(res.error);
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to delete');
        } finally {
            setSaving(false);
        }
    };

    return (
        <Paper
            variant="outlined"
            data-testid={`account-card-${account.id}`}
            sx={{
                p: 3,
                mb: 2,
            }}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
        >
            {/* Header */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box
                    sx={{ display: 'flex', alignItems: 'center', cursor: 'pointer', gap: 1 }}
                    onClick={() => setExpanded((prev) => !prev)}
                >
                    {expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                    <Typography variant="h6">{account.name}</Typography>
                    {account.institution && (
                        <Typography variant="body2" color="text.secondary">
                            — {account.institution}
                        </Typography>
                    )}
                </Box>
                <Box sx={{ visibility: (hovered || editing || saving) ? 'visible' : 'hidden' }}>
                    {!editing ? (
                        <>
                            <IconButton size="small" onClick={() => { setEditing(true); setExpanded(true); }} title="Edit">
                                <EditIcon fontSize="small" />
                            </IconButton>
                            <IconButton size="small" color="error" onClick={() => setConfirmDelete(true)} title="Delete">
                                <DeleteIcon fontSize="small" />
                            </IconButton>
                        </>
                    ) : (
                        <>
                            <IconButton size="small" color="primary" onClick={handleSave} disabled={saving} title="Save">
                                <SaveIcon fontSize="small" />
                            </IconButton>
                            <IconButton size="small" onClick={handleCancel} disabled={saving} title="Cancel">
                                <CancelIcon fontSize="small" />
                            </IconButton>
                        </>
                    )}
                </Box>
            </Box>

            {/* Collapsible content */}
            <Collapse in={expanded}>
                {error && (
                    <Alert severity="error" sx={{ mt: 1 }}>
                        {error}
                    </Alert>
                )}

                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2, mt: 2 }}>
                    {editing ? (
                        <>
                            <TextField
                                label="Account Name"
                                name="name"
                                value={form.name}
                                onChange={handleChange}
                                required
                                disabled={saving}
                            />
                            <TextField
                                label="Institution"
                                name="institution"
                                value={form.institution}
                                onChange={handleChange}
                                disabled={saving}
                            />
                            <TextField
                                label="Account Number"
                                name="account"
                                value={form.account}
                                onChange={handleChange}
                                required
                                disabled={saving}
                            />
                            <TextField
                                label="Routing Number"
                                name="routing"
                                value={form.routing}
                                onChange={handleChange}
                                required
                                disabled={saving}
                            />
                        </>
                    ) : (
                        <>
                            <Box>
                                <Typography variant="caption" color="text.secondary">Account Name</Typography>
                                <Typography>{account.name}</Typography>
                            </Box>
                            <Box>
                                <Typography variant="caption" color="text.secondary">Institution</Typography>
                                <Typography>{account.institution || '—'}</Typography>
                            </Box>
                            <Box>
                                <Typography variant="caption" color="text.secondary">Account Number</Typography>
                                <Typography>{account.account}</Typography>
                            </Box>
                            <Box>
                                <Typography variant="caption" color="text.secondary">Routing Number</Typography>
                                <Typography>{account.routing}</Typography>
                            </Box>
                        </>
                    )}
                </Box>
            </Collapse>

            {/* Delete confirmation dialog */}
            <Dialog open={confirmDelete} onClose={() => setConfirmDelete(false)}>
                <DialogTitle>Delete Account</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        Are you sure you want to delete <strong>{account.name}</strong>? This action cannot be undone.
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setConfirmDelete(false)} variant="text">Cancel</Button>
                    <Button onClick={handleDelete} color="error">Delete</Button>
                </DialogActions>
            </Dialog>
        </Paper>
    );
}



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
