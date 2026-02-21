import { Box, TextField, InputAdornment } from '@mui/material';
import FilterableColumnHeader from './FilterableColumnHeader';

export interface AmountFilterHeaderProps {
  amountMin?: number;
  amountMax?: number;
  onChange: (amountMin?: number, amountMax?: number) => void;
}

/**
 * Amount column header with min / max dollar amount inputs.
 */
export default function AmountFilterHeader({
  amountMin,
  amountMax,
  onChange,
}: AmountFilterHeaderProps) {
  const active = amountMin !== undefined || amountMax !== undefined;

  const popoverContent = (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 200 }}>
      <TextField
        type="number"
        label="Min amount"
        value={amountMin ?? ''}
        onChange={(e) => {
          const val = e.target.value !== '' ? Number(e.target.value) : undefined;
          onChange(val, amountMax);
        }}
        slotProps={{
          inputLabel: { shrink: true },
          input: {
            startAdornment: <InputAdornment position="start">$</InputAdornment>,
          },
        }}
        size="small"
        fullWidth
      />
      <TextField
        type="number"
        label="Max amount"
        value={amountMax ?? ''}
        onChange={(e) => {
          const val = e.target.value !== '' ? Number(e.target.value) : undefined;
          onChange(amountMin, val);
        }}
        slotProps={{
          inputLabel: { shrink: true },
          input: {
            startAdornment: <InputAdornment position="start">$</InputAdornment>,
          },
        }}
        size="small"
        fullWidth
      />
    </Box>
  );

  return (
    <FilterableColumnHeader
      label="Amount"
      active={active}
      popoverContent={popoverContent}
    />
  );
}
