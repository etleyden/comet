import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Container,
    Box,
    Typography,
    Paper,
    TextField,
    Button,
    Alert,
    IconButton,
    InputAdornment,
} from '@mui/material';
import { Visibility, VisibilityOff } from '@mui/icons-material';
import { useAuth } from '../context/AuthContext';
import { authApi } from '../../api';

/**
 * Page shown when a user must reset their password before continuing.
 * Typically triggered by `requiresPasswordReset` being true.
 */
export default function ResetPasswordPage() {
    const { user, refreshUser } = useAuth();
    const navigate = useNavigate();

    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showCurrent, setShowCurrent] = useState(false);
    const [showNew, setShowNew] = useState(false);
    const [error, setError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async () => {
        setError('');

        if (newPassword.length < 8) {
            setError('New password must be at least 8 characters.');
            return;
        }

        if (newPassword !== confirmPassword) {
            setError('Passwords do not match.');
            return;
        }

        if (currentPassword === newPassword) {
            setError('New password must be different from the current password.');
            return;
        }

        setIsSubmitting(true);
        try {
            const response = await authApi.resetPassword({ currentPassword, newPassword });
            if (response.success) {
                await refreshUser();
                navigate('/home', { replace: true });
            } else {
                setError(response.error);
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to reset password.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Container maxWidth="sm" sx={{ mt: 8 }}>
            <Paper sx={{ p: 4 }}>
                <Typography variant="h5" gutterBottom>
                    Password Reset {user?.requiresPasswordReset ? 'Required' : ''}
                </Typography>
                {user?.requiresPasswordReset && 
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                    {user?.name ? `Hi ${user.name}, you` : 'You'} must set a new password before continuing.
                </Typography>}
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <TextField
                        label="Current / Temporary Password"
                        type={showCurrent ? 'text' : 'password'}
                        value={currentPassword}
                        onChange={e => setCurrentPassword(e.target.value)}
                        slotProps={{
                            input: {
                                endAdornment: (
                                    <InputAdornment position="end">
                                        <IconButton
                                            onClick={() => setShowCurrent(v => !v)}
                                            onMouseDown={e => e.preventDefault()}
                                            edge="end"
                                        >
                                            {showCurrent ? <VisibilityOff /> : <Visibility />}
                                        </IconButton>
                                    </InputAdornment>
                                ),
                            },
                        }}
                    />
                    <TextField
                        label="New Password"
                        type={showNew ? 'text' : 'password'}
                        value={newPassword}
                        onChange={e => setNewPassword(e.target.value)}
                        slotProps={{
                            input: {
                                endAdornment: (
                                    <InputAdornment position="end">
                                        <IconButton
                                            onClick={() => setShowNew(v => !v)}
                                            onMouseDown={e => e.preventDefault()}
                                            edge="end"
                                        >
                                            {showNew ? <VisibilityOff /> : <Visibility />}
                                        </IconButton>
                                    </InputAdornment>
                                ),
                            },
                        }}
                    />
                    <TextField
                        label="Confirm New Password"
                        type={showNew ? 'text' : 'password'}
                        value={confirmPassword}
                        onChange={e => setConfirmPassword(e.target.value)}
                    />

                    {error && <Alert severity="error">{error}</Alert>}

                    <Button
                        variant="contained"
                        onClick={handleSubmit}
                        disabled={isSubmitting || !currentPassword || !newPassword || !confirmPassword}
                    >
                        {isSubmitting ? 'Saving…' : 'Set New Password'}
                    </Button>
                </Box>
            </Paper>
        </Container>
    );
}
