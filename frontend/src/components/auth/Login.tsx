import { useState } from 'react';
import {
  Box,
  Button,
  FormGroup,
  TextField,
  Typography,
  IconButton,
  InputAdornment,
} from '@mui/material';
import { Visibility, VisibilityOff } from '@mui/icons-material';
import { useAuth } from '../../context/AuthContext';
import Register from './Register';

/**
 * Login Component. Also allows users to access the registration form by default.
 * @param hideRegisterToggle If true, hides the register toggle and only shows the login form
 */
export default function Login({ hideRegisterToggle = false }: { hideRegisterToggle?: boolean }) {
  const [isRegistering, setIsRegistering] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const { login, isAuthenticated } = useAuth();

  const handleLogin = async () => {
    try {
      setError('');
      await login(email, password);
      setEmail('');
      setPassword('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    }
  };

  if (isAuthenticated) {
    return null;
  }

  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: 'center',
      }}
    >
      {isRegistering && !hideRegisterToggle ? (
        <Register onCancel={() => setIsRegistering(false)} />
      ) : (
        <FormGroup sx={{ display: 'flex', gap: 2, width: '100%', maxWidth: 300 }}>
          <Typography variant="h5">Login</Typography>
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
            <Button variant="contained" onClick={handleLogin}>
              Login
            </Button>
            {!hideRegisterToggle && (
              <Button variant="text" onClick={() => setIsRegistering(true)}>
                Register
              </Button>
            )}
          </Box>
        </FormGroup>
      )}
    </Box>
  );
}
