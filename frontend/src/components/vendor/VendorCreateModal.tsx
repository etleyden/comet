import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Box,
  Avatar,
  Typography,
  CircularProgress,
} from '@mui/material';
import StorefrontIcon from '@mui/icons-material/Storefront';
import type { Vendor } from 'shared';
import { vendorsApi } from '../../../api';

export interface VendorCreateModalProps {
  open: boolean;
  onClose: () => void;
  onCreated: (vendor: Vendor) => void;
  /** Pre-fill the name field (e.g. from search text) */
  initialName?: string;
}

export default function VendorCreateModal({
  open,
  onClose,
  onCreated,
  initialName = '',
}: VendorCreateModalProps) {
  const [name, setName] = useState(initialName);
  const [url, setUrl] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Reset form whenever the dialog opens
  useEffect(() => {
    if (open) {
      setName(initialName);
      setUrl('');
      setLogoUrl('');
      setError('');
      setSaving(false);
    }
  }, [open, initialName]);

  const handleSubmit = async () => {
    if (!name.trim()) {
      setError('Name is required');
      return;
    }

    setSaving(true);
    setError('');

    try {
      const res = await vendorsApi.createVendor({
        name: name.trim(),
        url: url.trim() || undefined,
        logoUrl: logoUrl.trim() || undefined,
      });

      if (res.success) {
        onCreated(res.data);
        onClose();
      } else {
        setError(res.error);
      }
    } catch {
      setError('Failed to create vendor');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="xs"
      fullWidth
    >
      <DialogTitle>Create New Vendor</DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
          {/* Logo preview */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Avatar
              src={logoUrl || undefined}
              sx={{ width: 48, height: 48, bgcolor: 'action.selected' }}
            >
              {!logoUrl && <StorefrontIcon />}
            </Avatar>
            <Typography variant="body2" color="text.secondary">
              {logoUrl ? 'Logo preview' : 'Add a logo URL below'}
            </Typography>
          </Box>

          <TextField
            label="Vendor Name"
            required
            fullWidth
            value={name}
            onChange={e => setName(e.target.value)}
            autoFocus
            error={!!error && !name.trim()}
            helperText={!name.trim() && error ? error : undefined}
          />

          <TextField
            label="Website URL"
            fullWidth
            value={url}
            onChange={e => setUrl(e.target.value)}
            placeholder="https://example.com"
            type="url"
          />

          <TextField
            label="Logo URL"
            fullWidth
            value={logoUrl}
            onChange={e => setLogoUrl(e.target.value)}
            placeholder="https://example.com/logo.png"
            type="url"
          />

          {error && name.trim() && (
            <Typography variant="body2" color="error">
              {error}
            </Typography>
          )}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} variant="text" disabled={saving}>
          Cancel
        </Button>
        <Button onClick={handleSubmit} disabled={saving}>
          {saving ? <CircularProgress size={20} /> : 'Create'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
