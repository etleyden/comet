import { FormControl, InputLabel, Select, MenuItem, Alert, CircularProgress } from "@mui/material";
import { useState, useEffect } from "react";
import { accountsApi } from "../../../api";
import type { Account } from "shared";

interface AccountSelectionProps {
    value: string;
    onChange: (accountId: string) => void;
    label?: string;
    required?: boolean;
    disabled?: boolean;
}

/**
 * UI component that allows users to select one of their existing accounts from a dropdown
 */
export default function AccountSelection({
    value,
    onChange,
    label = "Account",
    required = false,
    disabled = false
}: AccountSelectionProps) {
    const [accounts, setAccounts] = useState<Account[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        loadAccounts();
    }, []);

    const loadAccounts = async () => {
        setLoading(true);
        setError(null);

        try {
            const response = await accountsApi.getAccounts();

            if (response.success) {
                setAccounts(response.data);
            } else {
                setError(response.error);
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load accounts');
        } finally {
            setLoading(false);
        }
    };

    if (error) {
        return <Alert severity="error">{error}</Alert>;
    }

    if (loading) {
        return (
            <FormControl fullWidth disabled>
                <InputLabel>{label}</InputLabel>
                <Select value="" label={label}>
                    <MenuItem value="">
                        <CircularProgress size={20} />
                    </MenuItem>
                </Select>
            </FormControl>
        );
    }

    return (
        <FormControl fullWidth required={required} disabled={disabled}>
            <InputLabel>{label}</InputLabel>
            <Select
                value={value}
                label={label}
                onChange={(e) => onChange(e.target.value)}
            >
                {accounts.length === 0 ? (
                    <MenuItem value="" disabled>
                        No accounts available
                    </MenuItem>
                ) : (
                    accounts.map((account) => (
                        <MenuItem key={account.id} value={account.id}>
                            {account.name} {account.institution && `(${account.institution})`}
                        </MenuItem>
                    ))
                )}
            </Select>
        </FormControl>
    );
}
