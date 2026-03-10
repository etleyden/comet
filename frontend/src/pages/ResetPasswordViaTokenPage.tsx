import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link as RouterLink } from 'react-router-dom';
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
  CircularProgress,
  Link,
} from '@mui/material';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import { useAuth } from '../context/AuthContext';
import { authApi } from '../../api';
import { validatePassword } from 'shared';
import { useNotification } from '../context/NotificationContext';

type PageState = 'loading' | 'valid' | 'invalid' | 'success';

/**
 * Page reached via a password-reset email link.
 * URL: /reset-password/token?token=<id.secret>
 *
 * Flow:
 * 1. Validate the token on mount.
 * 2. If valid, show form to enter a new password.
 * 3. On submit, confirm the reset, auto-login, and redirect to /home.
 */
export default function ResetPasswordViaTokenPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { refreshUser } = useAuth();
  const { notify } = useNotification();

  const token = searchParams.get('token') ?? '';

  const [pageState, setPageState] = useState<PageState>('loading');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Validate token on mount
  useEffect(() => {
    if (!token) {
      setPageState('invalid');
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        const response = await authApi.validateResetToken({ token });
        if (cancelled) return;
        if (response.success && response.data.valid) {
          setPageState('valid');
        } else {
          setPageState('invalid');
        }
      } catch {
        if (!cancelled) setPageState('invalid');
      }
    })();

    return () => { cancelled = true; };
  }, [token]);

  const handleSubmit = async () => {
    setError('');

    const { valid, errors: pwErrors } = validatePassword(newPassword);
    if (!valid) {
      setError(`Password does not meet requirements: ${pwErrors.join(', ')}.`);
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await authApi.confirmResetPassword({ token, newPassword });
      if (response.success) {
        setPageState('success');
        // Sync auth context with the new session
        await refreshUser();
        // redirect with a success message
        notify('Password reset successful! Redirecting to dashboard…', "success");
        navigate('/home', { replace: true });
      } else {
        setError(response.error);
        notify('Failed to reset password.', "error");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reset password.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ─── Loading ───────────────────────────────────────────────
  if (pageState === 'loading') {
    return (
      <Container maxWidth="sm" sx={{ mt: 8 }}>
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <CircularProgress />
          <Typography sx={{ mt: 2 }}>Validating your reset link…</Typography>
        </Paper>
      </Container>
    );
  }

  // ─── Invalid / Expired Token ───────────────────────────────
  if (pageState === 'invalid') {
    return (
      <Container maxWidth="sm" sx={{ mt: 8 }}>
        <Paper sx={{ p: 4 }}>
          <Alert severity="error" sx={{ mb: 2 }}>
            This password reset link is invalid or has expired.
          </Alert>
          <Typography variant="body2">
            Please <Link component={RouterLink} to="/login">return to login</Link> and request a new reset link.
          </Typography>
        </Paper>
      </Container>
    );
  }

  // ─── Success ───────────────────────────────────────────────
  if (pageState === 'success') {
    return (
      <Container maxWidth="sm" sx={{ mt: 8 }}>
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Alert severity="success" sx={{ mb: 2 }}>
            Your password has been reset successfully!
          </Alert>
          <Typography variant="body2">Redirecting you to the dashboard…</Typography>
        </Paper>
      </Container>
    );
  }

  // ─── Valid Token — Show Form ───────────────────────────────
  return (
    <Container maxWidth="sm" sx={{ mt: 8 }}>
      <Paper sx={{ p: 4 }}>
        <Typography variant="h5" gutterBottom>
          Set a New Password
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Enter your new password below.
        </Typography>

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <TextField
            label="New Password"
            type={showPassword ? 'text' : 'password'}
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            slotProps={{
              input: {
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      onClick={() => setShowPassword((v) => !v)}
                      onMouseDown={(e) => e.preventDefault()}
                      edge="end"
                    >
                      {showPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              },
            }}
          />
          <TextField
            label="Confirm New Password"
            type={showPassword ? 'text' : 'password'}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />

          {error && <Alert severity="error">{error}</Alert>}

          <Button
            variant="contained"
            onClick={handleSubmit}
            disabled={isSubmitting || !newPassword || !confirmPassword}
          >
            {isSubmitting ? 'Saving…' : 'Reset Password'}
          </Button>
        </Box>
      </Paper>
    </Container>
  );
}

