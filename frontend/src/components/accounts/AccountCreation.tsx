import { TextField, Button, Alert } from "@mui/material";
import Box from "@mui/material/Box";
import { useState } from "react";
import { accountsApi } from "../../../api";

/**
 * UI component used to create a new account for a user to track
 */
export default function AccountCreation() {
    const [formData, setFormData] = useState({
        accountName: "",
        institution: "",
        accountNumber: "",
        routingNumber: "",
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        setSuccess(false);

        try {
            const response = await accountsApi.createAccount({
                name: formData.accountName,
                institution: formData.institution || undefined,
                account: formData.accountNumber,
                routing: formData.routingNumber,
            });

            if (response.success) {
                setSuccess(true);
                // Reset form
                setFormData({
                    accountName: "",
                    institution: "",
                    accountNumber: "",
                    routingNumber: "",
                });
            } else {
                setError(response.error);
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to create account');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {error && (
                <Alert severity="error">
                    {error}
                </Alert>
            )}
            {success && (
                <Alert severity="success">
                    Account created successfully!
                </Alert>
            )}
            <TextField
                label="Account Name"
                name="accountName"
                value={formData.accountName}
                onChange={handleChange}
                required
                disabled={loading}
            />
            <TextField
                label="Institution"
                name="institution"
                value={formData.institution}
                onChange={handleChange}
                disabled={loading}
            />
            <TextField
                label="Account Number"
                name="accountNumber"
                value={formData.accountNumber}
                onChange={handleChange}
                required
                disabled={loading}
            />
            <TextField
                label="Routing Number"
                name="routingNumber"
                value={formData.routingNumber}
                onChange={handleChange}
                required
                disabled={loading}
            />
            <Button type="submit" disabled={loading}>
                {loading ? 'Creating...' : 'Create'}
            </Button>
        </Box>
    );
}