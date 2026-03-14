import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Box,
  TextField,
  Paper,
  MenuList,
  MenuItem,
  Typography,
  InputAdornment,
  CircularProgress,
  ClickAwayListener,
  Popper,
  Button,
  Chip,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import VisibilityIcon from '@mui/icons-material/Visibility';
import AddIcon from '@mui/icons-material/Add';
import type { Vendor } from 'shared';
import { vendorsApi } from '../../../api';
import VendorDisplay from './VendorDisplay';
import { formatCount } from './formatCount';

export interface VendorSearchProps {
  /** Currently selected vendor ID (null if unassigned) */
  selectedVendorId?: string | null;
  /** Called when a vendor is selected */
  onSelect: (vendor: Vendor) => void;
  /** Called when the user clicks "Create New" */
  onCreateNew: (searchText: string) => void;
  /** Called when the dropdown is closed */
  onClose?: () => void;
  /** The anchor element to position the dropdown */
  anchorEl: HTMLElement | null;
  /** Whether the dropdown is open */
  open: boolean;
}

const DEBOUNCE_MS = 250;

export default function VendorSearch({
  selectedVendorId,
  onSelect,
  onCreateNew,
  onClose,
  anchorEl,
  open,
}: VendorSearchProps) {
  const [query, setQuery] = useState('');
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const fetchVendors = useCallback(async (searchQuery: string) => {
    setLoading(true);
    try {
      const res = await vendorsApi.searchVendors(searchQuery || undefined, 20);
      if (res.success) {
        setVendors(res.data);
      }
    } catch {
      // silently fail — dropdown shows empty
    } finally {
      setLoading(false);
    }
  }, []);

  // Load initial vendors when opened
  useEffect(() => {
    if (open) {
      fetchVendors('');
      // Focus input after a frame so Popper has rendered
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQuery('');
      setVendors([]);
    }
  }, [open, fetchVendors]);

  // Debounced search on query change
  useEffect(() => {
    if (!open) return;
    const timer = setTimeout(() => fetchVendors(query), DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [query, open, fetchVendors]);

  const handleSelect = (vendor: Vendor) => {
    onSelect(vendor);
    onClose?.();
  };

  if (!open || !anchorEl) return null;

  return (
    <ClickAwayListener onClickAway={() => onClose?.()}>
      <Popper
        open={open}
        anchorEl={anchorEl}
        placement="bottom-start"
        style={{ zIndex: 1300, minWidth: 280 }}
        modifiers={[{ name: 'offset', options: { offset: [0, 4] } }]}
      >
        <Paper
          elevation={8}
          sx={{ overflow: 'hidden', maxHeight: 360, display: 'flex', flexDirection: 'column' }}
        >
          {/* Search input */}
          <Box sx={{ p: 1, borderBottom: 1, borderColor: 'divider' }}>
            <TextField
              inputRef={inputRef}
              size="small"
              fullWidth
              placeholder="Search vendors…"
              value={query}
              onChange={e => setQuery(e.target.value)}
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon fontSize="small" />
                    </InputAdornment>
                  ),
                  endAdornment: query ? (
                    <InputAdornment position="end">
                      <Chip
                        label="×"
                        size="small"
                        onClick={() => setQuery('')}
                        sx={{ cursor: 'pointer', minWidth: 24, height: 20 }}
                      />
                    </InputAdornment>
                  ) : null,
                },
              }}
            />
          </Box>

          {/* Results list */}
          <Box sx={{ overflowY: 'auto', flex: 1 }}>
            {loading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
                <CircularProgress size={20} />
              </Box>
            ) : vendors.length === 0 && query ? (
              <Box sx={{ px: 2, py: 1.5 }}>
                <Typography variant="body2" color="text.secondary">
                  No vendors found
                </Typography>
              </Box>
            ) : (
              <MenuList dense disablePadding>
                {vendors.map(vendor => (
                  <MenuItem
                    key={vendor.id}
                    selected={vendor.id === selectedVendorId}
                    onClick={() => handleSelect(vendor)}
                    sx={{
                      py: 1,
                      px: 1.5,
                      display: 'flex',
                      justifyContent: 'space-between',
                      gap: 2,
                    }}
                  >
                    <VendorDisplay name={vendor.name} logoUrl={vendor.logoUrl} size={24} />
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexShrink: 0 }}>
                      <VisibilityIcon sx={{ fontSize: 14, color: 'text.disabled' }} />
                      <Typography variant="caption" color="text.secondary">
                        {formatCount(vendor.transactionCount ?? 0)}
                      </Typography>
                    </Box>
                  </MenuItem>
                ))}
              </MenuList>
            )}
          </Box>

          {/* Create new button */}
          <Box sx={{ borderTop: 1, borderColor: 'divider' }}>
            <Button
              fullWidth
              startIcon={<AddIcon />}
              onClick={() => {
                onCreateNew(query);
                onClose?.();
              }}
              sx={{ borderRadius: 0, textTransform: 'none', justifyContent: 'center', py: 1 }}
            >
              Create New
            </Button>
          </Box>
        </Paper>
      </Popper>
    </ClickAwayListener>
  );
}
