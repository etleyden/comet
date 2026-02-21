import { useState, useEffect } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Paper,
  CircularProgress,
  Typography,
} from '@mui/material';
import type { TransactionFilters, TransactionWithAccount } from 'shared';
import { transactionsApi } from '../../../api';
import {
  DateFilterHeader,
  AccountFilterHeader,
  VendorFilterHeader,
  CategoryFilterHeader,
  AmountFilterHeader,
} from './headers';

export interface TransactionTableProps {
  /**
   * External filter applied on top of the header-driven filters.
   * Use this to constrain the table to a specific context, e.g. a single
   * account view. External filter values take precedence over header
   * filters for overlapping keys.
   *
   * Callers should memoize this object to avoid unnecessary refetches.
   */
  filter?: TransactionFilters;
}

/** Debounce delay (ms) for fetch triggered by filter / pagination changes. */
const FETCH_DEBOUNCE_MS = 300;

export default function TransactionTable({ filter: externalFilter }: TransactionTableProps) {
  // ── Filter state managed by column header popovers ─────────────
  const [headerFilter, setHeaderFilter] = useState<TransactionFilters>({});

  // ── Pagination ─────────────────────────────────────────────────
  const [page, setPage] = useState(0); // 0-indexed (MUI convention)
  const [rowsPerPage, setRowsPerPage] = useState(25);

  // ── Data ───────────────────────────────────────────────────────
  const [transactions, setTransactions] = useState<TransactionWithAccount[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  // Merge external & header filters (external wins on overlap)
  const mergedFilter: TransactionFilters = {
    ...headerFilter,
    ...(externalFilter ?? {}),
  };

  // Serialise for stable effect dependency comparison
  const filterKey = JSON.stringify(mergedFilter);

  // ── Fetch on filter / pagination change (debounced) ────────────
  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    const timer = setTimeout(() => {
      const currentFilter: TransactionFilters = JSON.parse(filterKey);
      const hasFilter = Object.values(currentFilter).some((v) => v !== undefined);

      transactionsApi
        .getTransactions({
          page: page + 1, // API is 1-indexed
          limit: rowsPerPage,
          filter: hasFilter ? currentFilter : undefined,
        })
        .then((res) => {
          if (cancelled) return;
          if (res.success) {
            setTransactions(res.data.transactions);
            setTotal(res.data.total);
          }
        })
        .catch((err) => {
          if (!cancelled) console.error('Failed to fetch transactions:', err);
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    }, FETCH_DEBOUNCE_MS);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [page, rowsPerPage, filterKey]);

  // ── Filter helpers ─────────────────────────────────────────────
  const updateFilter = (patch: Partial<TransactionFilters>) => {
    setHeaderFilter((prev: TransactionFilters) => {
      const next = { ...prev, ...patch };

      // Remove keys whose value is undefined so they don't override
      // external filter values during the merge
      for (const key of Object.keys(next) as (keyof TransactionFilters)[]) {
        if (next[key] === undefined) delete next[key];
      }
      return next;
    });
    setPage(0); // reset to first page whenever filters change
  };

  // ── Formatters ─────────────────────────────────────────────────
  const formatDate = (dateStr: string) => {
    // Parse only the date portion to avoid timezone-shift issues
    const [datePart] = dateStr.split('T');
    const [year, month, day] = datePart.split('-');
    return `${month}-${day}-${year}`;
  };

  const formatAmount = (amount: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);

  // ── Render ─────────────────────────────────────────────────────
  return (
    <Paper>
      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow>
              <DateFilterHeader
                dateFrom={headerFilter.dateFrom}
                dateTo={headerFilter.dateTo}
                onChange={(dateFrom, dateTo) => updateFilter({ dateFrom, dateTo })}
              />
              <AccountFilterHeader
                selectedAccountIds={headerFilter.accountIds ?? []}
                onChange={(accountIds) =>
                  updateFilter({ accountIds: accountIds.length > 0 ? accountIds : undefined })
                }
              />
              <VendorFilterHeader
                vendors={headerFilter.vendors ?? []}
                onChange={(vendors) =>
                  updateFilter({ vendors: vendors.length > 0 ? vendors : undefined })
                }
              />
              <CategoryFilterHeader
                selectedCategoryIds={headerFilter.categoryIds ?? []}
                onChange={(categoryIds) =>
                  updateFilter({ categoryIds: categoryIds.length > 0 ? categoryIds : undefined })
                }
              />
              <AmountFilterHeader
                amountMin={headerFilter.amountMin}
                amountMax={headerFilter.amountMax}
                onChange={(amountMin, amountMax) => updateFilter({ amountMin, amountMax })}
              />
              <TableCell>
                <Typography variant="subtitle2" fontWeight="bold" noWrap>
                  Notes
                </Typography>
              </TableCell>
            </TableRow>
          </TableHead>

          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} align="center" sx={{ py: 6 }}>
                  <CircularProgress />
                </TableCell>
              </TableRow>
            ) : transactions.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} align="center" sx={{ py: 6 }}>
                  <Typography color="text.secondary">No transactions found</Typography>
                </TableCell>
              </TableRow>
            ) : (
              transactions.map((tx) => (
                <TableRow key={tx.id} hover>
                  <TableCell>{formatDate(tx.date)}</TableCell>
                  <TableCell>{tx.accountName}</TableCell>
                  {/* TODO: Display vendor name once the Vendor entity and API exist */}
                  <TableCell>{'—'}</TableCell>
                  <TableCell>{tx.categoryName ?? '—'}</TableCell>
                  <TableCell align="right">{formatAmount(tx.amount)}</TableCell>
                  <TableCell>{tx.notes ?? '—'}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <TablePagination
        component="div"
        count={total}
        page={page}
        onPageChange={(_, newPage) => setPage(newPage)}
        rowsPerPage={rowsPerPage}
        onRowsPerPageChange={(e) => {
          setRowsPerPage(parseInt(e.target.value, 10));
          setPage(0);
        }}
        rowsPerPageOptions={[10, 25, 50, 100]}
      />
    </Paper>
  );
}