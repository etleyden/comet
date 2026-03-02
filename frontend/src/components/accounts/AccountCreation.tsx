import { TextField, Button, Alert, Paper, Typography, Box } from "@mui/material";
import { useState } from "react";
import { accountsApi } from "../../../api";

interface AccountCreationProps {
    onCreated: () => void;
    onCancel: () => void;
}

/**
 * UI component used to create a new account for a user to track.
 */
export default function AccountCreation({ onCreated, onCancel }: AccountCreationProps) {
    const [form, setForm] = useState({
        name: '',
        institution: '',
        account: '',
        routing: '',
    });
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setError(null);
        try {
            const response = await accountsApi.createAccount({
                name: formData.accountName,
                institution: formData.institution || undefined,
                account: formData.accountNumber || undefined,
                routing: formData.routingNumber || undefined,
            });
            if (res.success) {
                onCreated();
            } else {
                setError(res.error);
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to create account');
        } finally {
            setSaving(false);
        }
    };

    return (
        <Paper variant="outlined" sx={{ p: 3, mb: 2 }}>
            <Typography variant="h6" gutterBottom>New Account</Typography>
            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
            <Box
                component="form"
                onSubmit={handleSubmit}
                sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}
            >
                <TextField label="Account Name" name="name" value={form.name} onChange={handleChange} required disabled={saving} />
                <TextField label="Institution" name="institution" value={form.institution} onChange={handleChange} disabled={saving} />
                <TextField label="Account Number" name="account" value={form.account} onChange={handleChange} disabled={saving} />
                <TextField label="Routing Number" name="routing" value={form.routing} onChange={handleChange} disabled={saving} />
                <Box sx={{ gridColumn: '1 / -1', display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
                    <Button onClick={onCancel} variant="text" disabled={saving}>Cancel</Button>
                    <Button type="submit" disabled={saving}>{saving ? 'Creating…' : 'Create'}</Button>
                </Box>
            </Box>
        </Paper>
    );
}