import { useState } from 'react';
import { TableCell, Box, IconButton, Popover, Typography } from '@mui/material';
import FilterListIcon from '@mui/icons-material/FilterList';

export interface FilterableColumnHeaderProps {
  /** Column display name */
  label: string;
  /** Whether a filter is currently active on this column */
  active?: boolean;
  /** Content rendered inside the filter popover */
  popoverContent: React.ReactNode;
  /** Optional fixed or min width for the column */
  width?: number | string;
}

/**
 * Reusable table column header with a filter icon that opens an MUI Popover.
 *
 * Each specialised header (Date, Account, Vendor, …) wraps this component and
 * supplies its own `popoverContent`.
 */
export default function FilterableColumnHeader({
  label,
  active = false,
  popoverContent,
  width,
}: FilterableColumnHeaderProps) {
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const open = Boolean(anchorEl);

  const header = (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, width: '100%', minWidth: 0 }}>
      <IconButton
        size="small"
        onClick={e => setAnchorEl(e.currentTarget)}
        color={active ? 'primary' : 'default'}
        aria-label={`Filter ${label}`}
      >
        <FilterListIcon fontSize="small" />
      </IconButton>
      <Typography variant="subtitle2" fontWeight="bold" noWrap>
        {label}
      </Typography>
    </Box>
  );

  const popover = (
    <Popover
      open={open}
      anchorEl={anchorEl}
      onClose={() => setAnchorEl(null)}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
      transformOrigin={{ vertical: 'top', horizontal: 'left' }}
      slotProps={{ paper: { sx: { p: 2, minWidth: 250 } } }}
    >
      {popoverContent}
    </Popover>
  );

  return (
    <Box sx={{ width: '100%', minWidth: 0 }}>
      {header}
      {popover}
    </Box>
  );
}
