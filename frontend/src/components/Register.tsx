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
import { useState } from 'react';
import { useAuth } from '../context/AuthContext';

export default function Register(props?: { onCancel?: () => void }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const { register } = useAuth();

  const handleRegistration = async () => {
    try {
      setError('');
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
    <FormGroup sx={{ display: 'flex', gap: 2, width: '100%', maxWidth: 300 }}>
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
        <Button variant="contained" onClick={handleRegistration}>
          Register
        </Button>
        {props?.onCancel && (
          <Button variant="outlined" onClick={props.onCancel}>
            Cancel
          </Button>
        )}
      </Box>
    </FormGroup>
  );
}
