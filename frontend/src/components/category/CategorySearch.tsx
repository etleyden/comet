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
  Chip,
  Divider,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import BlockIcon from '@mui/icons-material/Block';
import type { Category, CategoryWithChildren } from 'shared';
import { categoriesApi } from '../../../api';

export interface CategorySearchProps {
  /** Currently selected category ID (null if unassigned) */
  selectedCategoryId?: string | null;
  /** Called when a category is selected */
  onSelect: (category: Category | null) => void;
  /** Called when the dropdown is closed */
  onClose?: () => void;
  /** The anchor element to position the dropdown */
  anchorEl: HTMLElement | null;
  /** Whether the dropdown is open */
  open: boolean;
}

const DEBOUNCE_MS = 200;

export default function CategorySearch({
  selectedCategoryId,
  onSelect,
  onClose,
  anchorEl,
  open,
}: CategorySearchProps) {
  const [query, setQuery] = useState('');
  const [allCategories, setAllCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const fetchCategories = useCallback(async () => {
    setLoading(true);
    try {
      const res = await categoriesApi.getCategories();
      if (res.success) {
        // Flatten the category tree into a flat list
        const flat: Category[] = [];
        for (const parent of res.data.categories) {
          flat.push(parent);
          for (const child of parent.children ?? []) {
            flat.push(child);
          }
        }
        setAllCategories(flat);
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) {
      fetchCategories();
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQuery('');
    }
  }, [open, fetchCategories]);

  const filtered = query.trim()
    ? allCategories.filter(c =>
        c.name.toLowerCase().includes(query.toLowerCase()) ||
        (c.parentName ?? '').toLowerCase().includes(query.toLowerCase()),
      )
    : allCategories;

  const handleSelect = (category: Category | null) => {
    onSelect(category);
    onClose?.();
  };

  // Group filtered categories by parent (or "Top-level" if no parent)
  const grouped = filtered.reduce<Record<string, Category[]>>((acc, cat) => {
    const key = cat.parentName ?? '';
    if (!acc[key]) acc[key] = [];
    acc[key].push(cat);
    return acc;
  }, {});

  if (!open || !anchorEl) return null;

  return (
    <ClickAwayListener onClickAway={() => onClose?.()}>
      <Popper
        open={open}
        anchorEl={anchorEl}
        placement="bottom-start"
        style={{ zIndex: 1300, minWidth: 260 }}
        modifiers={[{ name: 'offset', options: { offset: [0, 4] } }]}
      >
        <Paper
          elevation={8}
          sx={{ overflow: 'hidden', maxHeight: 380, display: 'flex', flexDirection: 'column' }}
        >
          {/* Search input */}
          <Box sx={{ p: 1, borderBottom: 1, borderColor: 'divider' }}>
            <TextField
              inputRef={inputRef}
              size="small"
              fullWidth
              placeholder="Search categories…"
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
            ) : (
              <MenuList dense disablePadding>
                {/* Unassign option */}
                <MenuItem
                  onClick={() => handleSelect(null)}
                  sx={{ py: 0.75, px: 1.5, gap: 1 }}
                >
                  <BlockIcon fontSize="small" sx={{ color: 'text.disabled' }} />
                  <Typography variant="body2" color="text.secondary">
                    Unassign category
                  </Typography>
                </MenuItem>
                <Divider />

                {filtered.length === 0 ? (
                  <Box sx={{ px: 2, py: 1.5 }}>
                    <Typography variant="body2" color="text.secondary">
                      No categories found
                    </Typography>
                  </Box>
                ) : (
                  Object.entries(grouped).map(([parentName, cats]) => (
                    <Box key={parentName || '__top'}>
                      {parentName && (
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          sx={{ px: 1.5, pt: 0.5, pb: 0.25, display: 'block', fontWeight: 600 }}
                        >
                          {parentName}
                        </Typography>
                      )}
                      {cats.map(cat => (
                        <MenuItem
                          key={cat.id}
                          selected={cat.id === selectedCategoryId}
                          onClick={() => handleSelect(cat)}
                          sx={{ py: 0.75, px: parentName ? 2.5 : 1.5 }}
                        >
                          <Typography variant="body2" noWrap>
                            {cat.name}
                          </Typography>
                        </MenuItem>
                      ))}
                    </Box>
                  ))
                )}
              </MenuList>
            )}
          </Box>
        </Paper>
      </Popper>
    </ClickAwayListener>
  );
}
