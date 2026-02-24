import { useState, useEffect } from 'react';
import {
  Box,
  Checkbox,
  FormControlLabel,
  FormGroup,
  TextField,
  CircularProgress,
  Typography,
} from '@mui/material';
import FilterableColumnHeader from './FilterableColumnHeader';
import type { Category } from 'shared';

export interface CategoryFilterHeaderProps {
  selectedCategoryIds: (string | null)[];
  onChange: (categoryIds: (string | null)[]) => void;
}

/**
 * Category column header with a searchable checkbox list.
 *
 * The search field at the top narrows the visible checkboxes but does not
 * affect the actual filter — it just makes it easier to find a category.
 *
 * An "Uncategorized" option (value = null) lets users include transactions
 * that have no category assigned.
 */
export default function CategoryFilterHeader({
  selectedCategoryIds,
  onChange,
}: CategoryFilterHeaderProps) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState('');

  useEffect(() => {
    // TODO: Replace with actual API call when the categories endpoint is available.
    // Example:
    //   categoriesApi.getCategories().then((res) => {
    //     if (res.success) setCategories(res.data);
    //   });
    setCategories([]);
    setLoading(false);
  }, []);

  const handleToggle = (categoryId: string | null) => {
    if (selectedCategoryIds.includes(categoryId)) {
      onChange(selectedCategoryIds.filter((id) => id !== categoryId));
    } else {
      onChange([...selectedCategoryIds, categoryId]);
    }
  };

  const filteredCategories = categories.filter((cat) =>
    cat.name.toLowerCase().includes(searchText.toLowerCase()),
  );

  const active = selectedCategoryIds.length > 0;

  const popoverContent = (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, minWidth: 240 }}>
      <TextField
        placeholder="Search categories…"
        value={searchText}
        onChange={(e) => setSearchText(e.target.value)}
        size="small"
        fullWidth
      />

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
          <CircularProgress size={24} />
        </Box>
      ) : (
        <FormGroup sx={{ maxHeight: 250, overflow: 'auto' }}>
          {/* Always show the Uncategorized option regardless of search text */}
          <FormControlLabel
            control={
              <Checkbox
                checked={selectedCategoryIds.includes(null)}
                onChange={() => handleToggle(null)}
                size="small"
              />
            }
            label="Uncategorized"
          />

          {filteredCategories.length === 0 && categories.length === 0 ? (
            <Typography variant="body2" color="text.secondary" sx={{ px: 1, py: 0.5 }}>
              No categories available
            </Typography>
          ) : (
            filteredCategories.map((category) => (
              <FormControlLabel
                key={category.id}
                control={
                  <Checkbox
                    checked={selectedCategoryIds.includes(category.id)}
                    onChange={() => handleToggle(category.id)}
                    size="small"
                  />
                }
                label={category.name}
              />
            ))
          )}
        </FormGroup>
      )}
    </Box>
  );

  return (
    <FilterableColumnHeader
      label="Category"
      active={active}
      popoverContent={popoverContent}
    />
  );
}
