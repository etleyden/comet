import { useState } from 'react';
import { Box, TextField, ToggleButton, ToggleButtonGroup } from '@mui/material';
import FilterableColumnHeader from './FilterableColumnHeader';

type DateMode = 'before' | 'after' | 'range';

export interface DateFilterHeaderProps {
  dateFrom?: string;
  dateTo?: string;
  onChange: (dateFrom?: string, dateTo?: string) => void;
}

/**
 * Date column header with a filter popover offering Before / After / Range modes.
 */
export default function DateFilterHeader({ dateFrom, dateTo, onChange }: DateFilterHeaderProps) {
  const [mode, setMode] = useState<DateMode>(() => {
    if (dateFrom && dateTo) return 'range';
    if (dateFrom) return 'after';
    if (dateTo) return 'before';
    return 'after';
  });

  const active = Boolean(dateFrom || dateTo);

  const handleModeChange = (_: React.MouseEvent, newMode: DateMode | null) => {
    if (!newMode) return;
    setMode(newMode);
    // Preserve values that still apply to the new mode
    if (newMode === 'before') onChange(undefined, dateTo);
    else if (newMode === 'after') onChange(dateFrom, undefined);
    // Range keeps both
  };

  const popoverContent = (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 220 }}>
      <ToggleButtonGroup
        value={mode}
        exclusive
        onChange={handleModeChange}
        size="small"
        fullWidth
      >
        <ToggleButton value="before">Before</ToggleButton>
        <ToggleButton value="after">After</ToggleButton>
        <ToggleButton value="range">Range</ToggleButton>
      </ToggleButtonGroup>

      {mode === 'before' && (
        <TextField
          type="date"
          label="Before"
          value={dateTo ?? ''}
          onChange={(e) => onChange(undefined, e.target.value || undefined)}
          slotProps={{ inputLabel: { shrink: true } }}
          fullWidth
        />
      )}

      {mode === 'after' && (
        <TextField
          type="date"
          label="After"
          value={dateFrom ?? ''}
          onChange={(e) => onChange(e.target.value || undefined, undefined)}
          slotProps={{ inputLabel: { shrink: true } }}
          fullWidth
        />
      )}

      {mode === 'range' && (
        <>
          <TextField
            type="date"
            label="From"
            value={dateFrom ?? ''}
            onChange={(e) => onChange(e.target.value || undefined, dateTo)}
            slotProps={{ inputLabel: { shrink: true } }}
            fullWidth
          />
          <TextField
            type="date"
            label="To"
            value={dateTo ?? ''}
            onChange={(e) => onChange(dateFrom, e.target.value || undefined)}
            slotProps={{ inputLabel: { shrink: true } }}
            fullWidth
          />
        </>
      )}
    </Box>
  );

  return (
    <FilterableColumnHeader
      label="Date"
      active={active}
      popoverContent={popoverContent}
    />
  );
}
