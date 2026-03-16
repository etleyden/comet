import { useState, useRef } from 'react';
import { Box, Typography, IconButton, Tooltip } from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import type { TransactionWithAccount, Vendor } from 'shared';
import { vendorsApi, parseApiError } from '../../../api';
import { useNotification } from '../../context/NotificationContext';
import { VendorDisplay, VendorSearch, VendorCreateModal } from '../vendor';

export interface VendorCellProps {
  transaction: TransactionWithAccount;
  /** Called after vendor assignment succeeds so the parent can refresh */
  onVendorAssigned?: () => void;
}

/**
 * Renders the vendor column cell in the transaction table.
 *
 * - If the transaction has a canonical vendor entity: shows icon + name.
 * - If only a raw vendorLabel string: shows italicized text (no icon).
 * - Hover reveals an edit button that opens the VendorSearch dropdown.
 */
export default function VendorCell({ transaction, onVendorAssigned }: VendorCellProps) {
  const { notify } = useNotification();
  const [hovered, setHovered] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [createInitialName, setCreateInitialName] = useState('');
  const cellRef = useRef<HTMLDivElement>(null);

  const hasCanonicalVendor = !!transaction.vendorId;
  const displayName = transaction.vendorName ?? transaction.vendorLabel;

  const handleSelectVendor = async (vendor: Vendor) => {
    try {
      const res = await vendorsApi.assignVendorToTransaction(transaction.id, {
        vendorId: vendor.id,
      });
      if (res.success) {
        onVendorAssigned?.();
      }
    } catch (err) {
      notify(parseApiError(err), 'error');
    }
  };

  const handleCreateNew = (searchText: string) => {
    setCreateInitialName(searchText);
    setCreateOpen(true);
  };

  const handleVendorCreated = async (vendor: Vendor) => {
    // After creation, assign it to this transaction
    try {
      const res = await vendorsApi.assignVendorToTransaction(transaction.id, {
        vendorId: vendor.id,
      });
      if (res.success) {
        onVendorAssigned?.();
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
          {hasCanonicalVendor ? (
            <Tooltip title={transaction.vendorLabel ? `Raw: ${transaction.vendorLabel}` : undefined} arrow>
              <Box>
                <VendorDisplay
                  name={transaction.vendorName!}
                  logoUrl={transaction.vendorLogoUrl}
                  size={20}
                />
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
          aria-label="Edit vendor"
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

      {/* Vendor search dropdown */}
      <VendorSearch
        open={searchOpen}
        anchorEl={cellRef.current}
        selectedVendorId={transaction.vendorId ?? null}
        onSelect={handleSelectVendor}
        onCreateNew={handleCreateNew}
        onClose={() => setSearchOpen(false)}
      />

      {/* Create vendor modal */}
      <VendorCreateModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={handleVendorCreated}
        initialName={createInitialName}
      />
    </>
  );
}
