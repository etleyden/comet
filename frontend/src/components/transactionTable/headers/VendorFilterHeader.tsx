import { useState } from 'react';
import { Box, TextField, Chip, Button } from '@mui/material';
import FilterableColumnHeader from './FilterableColumnHeader';

export interface VendorFilterHeaderProps {
  vendors: string[];
  onChange: (vendors: string[]) => void;
}

/**
 * Vendor column header with a text field for adding substring filter chips.
 *
 * The user types a vendor substring, presses Enter, and a Chip appears.
 * Each chip can be individually removed. A "clear" button removes all chips.
 * The resulting array of substrings is OR'd together on the backend.
 *
 * TODO: The backend currently matches these substrings against `tx.notes`
 * (the description field). Once a proper Vendor entity exists, update the
 * backend filter to match against the vendor name instead.
 */
export default function VendorFilterHeader({ vendors, onChange }: VendorFilterHeaderProps) {
  const [inputValue, setInputValue] = useState('');

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && inputValue.trim()) {
      e.preventDefault();
      const trimmed = inputValue.trim();
      if (!vendors.includes(trimmed)) {
        onChange([...vendors, trimmed]);
      }
      setInputValue('');
    }
  };

  const handleDelete = (vendor: string) => {
    onChange(vendors.filter((v) => v !== vendor));
  };

  const handleClear = () => {
    onChange([]);
    setInputValue('');
  };

  const active = vendors.length > 0;

  const popoverContent = (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, minWidth: 240 }}>
      <TextField
        placeholder="Type and press Enter"
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onKeyDown={handleKeyDown}
        size="small"
        fullWidth
        autoFocus
      />

      {vendors.length > 0 && (
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
          {vendors.map((vendor) => (
            <Chip
              key={vendor}
              label={vendor}
              onDelete={() => handleDelete(vendor)}
              size="small"
            />
          ))}
        </Box>
      )}

      {vendors.length > 0 && (
        <Button
          onClick={handleClear}
          variant='text'
          size="small"
          sx={{
            textDecoration: 'underline',
            textTransform: 'none',
            alignSelf: 'flex-start',
            p: 0,
            minWidth: 0,
          }}
        >
          clear
        </Button>
      )}
    </Box>
  );

  return (
    <FilterableColumnHeader
      label="Vendor"
      active={active}
      popoverContent={popoverContent}
    />
  );
}
