import { useState, useRef } from 'react';
import { Box, Typography, IconButton, Tooltip } from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import LabelIcon from '@mui/icons-material/Label';
import type { Category, TransactionWithAccount } from 'shared';
import { categoriesApi, parseApiError } from '../../../api';
import { useNotification } from '../../context/NotificationContext';
import CategorySearch from '../category/CategorySearch';

export interface CategoryCellProps {
  transaction: TransactionWithAccount;
  /** Called after category assignment succeeds so the parent can refresh */
  onCategoryAssigned?: () => void;
}

/**
 * Renders the category column cell in the transaction table.
 *
 * - If the transaction has a canonical category entity: shows icon + name.
 * - If only a raw categoryLabel string: shows italicized text.
 * - Hover reveals an edit button that opens the CategorySearch dropdown.
 */
export default function CategoryCell({ transaction, onCategoryAssigned }: CategoryCellProps) {
  const { notify } = useNotification();
  const [hovered, setHovered] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const cellRef = useRef<HTMLDivElement>(null);

  const hasCanonicalCategory = !!transaction.categoryId;
  const displayName = transaction.categoryName ?? transaction.categoryLabel;

  const handleSelectCategory = async (category: Category | null) => {
    try {
      const res = await categoriesApi.assignCategoryToTransaction(transaction.id, {
        categoryId: category?.id ?? null,
      });
      if (res.success) {
        onCategoryAssigned?.();
      }
    } catch (err) {
      notify(parseApiError(err), 'error');
    }
  };

  return (
    <>
      <Box
        ref={cellRef}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        sx={{
          display: 'flex',
          alignItems: 'center',
          minWidth: 0,
          gap: 0.5,
        }}
      >
        <Box sx={{ minWidth: 0, overflow: 'hidden' }}>
          {hasCanonicalCategory ? (
            <Tooltip
              title={
                transaction.categoryLabel && transaction.categoryLabel !== transaction.categoryName
                  ? `Raw: ${transaction.categoryLabel}`
                  : undefined
              }
              arrow
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <LabelIcon sx={{ fontSize: 16, color: 'text.secondary', flexShrink: 0 }} />
                <Typography variant="body2" noWrap>
                  {transaction.categoryName}
                </Typography>
              </Box>
            </Tooltip>
          ) : displayName ? (
            <Tooltip title={displayName} arrow>
              <Typography
                variant="body2"
                noWrap
                sx={{ pr: 1, fontStyle: 'italic', color: 'text.secondary' }}
              >
                {displayName}
              </Typography>
            </Tooltip>
          ) : (
            <Typography variant="body2" color="text.disabled">
              —
            </Typography>
          )}
        </Box>

        {/* Edit button — visible on hover */}
        <IconButton
          size="small"
          aria-label="Edit category"
          onClick={() => setSearchOpen(true)}
          sx={{
            opacity: hovered || searchOpen ? 1 : 0,
            visibility: hovered || searchOpen ? 'visible' : 'hidden',
            pointerEvents: hovered || searchOpen ? 'auto' : 'none',
            transition: 'opacity 0.15s',
            flexShrink: 0,
            p: 0.25,
          }}
        >
          <EditIcon sx={{ fontSize: 16 }} />
        </IconButton>
      </Box>

      {/* Category search dropdown */}
      <CategorySearch
        open={searchOpen}
        anchorEl={cellRef.current}
        selectedCategoryId={transaction.categoryId ?? null}
        onSelect={handleSelectCategory}
        onClose={() => setSearchOpen(false)}
      />
    </>
  );
}
