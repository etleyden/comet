import { useState, useEffect } from 'react';
import {
  Box,
  Checkbox,
  FormControlLabel,
  FormGroup,
  CircularProgress,
  Typography,
} from '@mui/material';
import FilterableColumnHeader from './FilterableColumnHeader';
import { accountsApi } from '../../../../api';
import type { Account } from 'shared';

export interface AccountFilterHeaderProps {
  selectedAccountIds: string[];
  onChange: (accountIds: string[]) => void;
}

/**
 * Account column header with a checkbox list of the user's accounts.
 */
export default function AccountFilterHeader({
  selectedAccountIds,
  onChange,
}: AccountFilterHeaderProps) {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    accountsApi
      .getAccounts()
      .then((res) => {
        if (res.success) setAccounts(res.data);
      })
      .catch(() => {
        /* swallow — the list will simply stay empty */
      })
      .finally(() => setLoading(false));
  }, []);

  const handleToggle = (accountId: string) => {
    if (selectedAccountIds.includes(accountId)) {
      onChange(selectedAccountIds.filter((id) => id !== accountId));
    } else {
      onChange([...selectedAccountIds, accountId]);
    }
  };

  const active = selectedAccountIds.length > 0;

  const popoverContent = (
    <Box>
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
          <CircularProgress size={24} />
        </Box>
      ) : accounts.length === 0 ? (
        <Typography variant="body2" color="text.secondary">
          No accounts found
        </Typography>
      ) : (
        <FormGroup>
          {accounts.map((account) => (
            <FormControlLabel
              key={account.id}
              control={
                <Checkbox
                  checked={selectedAccountIds.includes(account.id)}
                  onChange={() => handleToggle(account.id)}
                  size="small"
                />
              }
              label={account.name}
            />
          ))}
        </FormGroup>
      )}
    </Box>
  );

  return (
    <FilterableColumnHeader
      label="Account"
      active={active}
      popoverContent={popoverContent}
    />
  );
}
