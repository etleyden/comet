import {
  Box,
  Button,
  FormGroup,
  TextField,
  Typography,
  IconButton,
  InputAdornment,
} from '@mui/material';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { validatePassword } from 'shared';
import ForgotPassword from './ForgotPassword';

export default function Register(props?: { onCancel?: () => void }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isRequestingReset, setIsRequestingReset] = useState(false);
  const [error, setError] = useState('');
  const { register } = useAuth();

  const handleRegistration = async () => {
    setError('');

    const { valid, errors: pwErrors } = validatePassword(password);
    if (!valid) {
      setError(`Password does not meet requirements: ${pwErrors.join(', ')}.`);
      return;
    }

    try {
      await register(name, email, password);
      setName('');
      setEmail('');
      setPassword('');
      props?.onCancel?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed');
    }
  };

  return (
    <>
      {isRequestingReset ? (
        <ForgotPassword onCancel={() => setIsRequestingReset(false)} />
      ) : (
        <FormGroup sx={{ display: 'flex', gap: 2, width: '100%' }}>
          <Typography variant="h5">Register</Typography>
          <TextField
            label="Name"
            variant="outlined"
            value={name}
            onChange={e => setName(e.target.value)}
          />
          <TextField
            label="Email"
            variant="outlined"
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
          />
          <TextField
            label="Password"
            variant="outlined"
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={e => setPassword(e.target.value)}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    aria-label="toggle password visibility"
                    onClick={() => setShowPassword(!showPassword)}
                    onMouseDown={e => e.preventDefault()}
                    edge="end"
                  >
                    {showPassword ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />
          {error && (
            <Typography color="error" variant="body2">
              {error}
            </Typography>
          )}
          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button variant="contained" onClick={handleRegistration}>
                Register
              </Button>

              {props?.onCancel && (
                <Button variant="outlined" onClick={props.onCancel}>
                  Cancel
                </Button>
              )}
            </Box>
            <Button variant="text" onClick={() => setIsRequestingReset(true)}>
              Forgot?
            </Button>
          </Box>
        </FormGroup>
      )}
    </>
  );
}
