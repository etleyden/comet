import { useState, useEffect, useCallback, useMemo } from 'react';
import {
    Box,
    IconButton,
    Link,
    ListItemText,
    Menu,
    MenuItem,
} from '@mui/material';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import { DataGrid, type GridColDef, type GridPaginationModel } from '@mui/x-data-grid';
import type { TransactionFilters, TransactionWithAccount } from 'shared';
import { transactionsApi } from '../../../api';
import {
    DateFilterHeader,
    AccountFilterHeader,
    VendorFilterHeader,
    CategoryFilterHeader,
    AmountFilterHeader,
} from './headers';
import VendorCell from './VendorCell';
import CategoryCell from './CategoryCell';

export type TransactionDataGridProps = {
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

const FETCH_DEBOUNCE_MS = 300;

export default function TransactionDataGrid({
    filter: externalFilter,
}: TransactionDataGridProps) {
    const [headerFilter, setHeaderFilter] = useState<TransactionFilters>({});
    const [paginationModel, setPaginationModel] = useState<GridPaginationModel>({
        page: 0,
        pageSize: 25,
    });
    const [transactions, setTransactions] = useState<TransactionWithAccount[]>([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(true);
    const [refetchKey, setRefetchKey] = useState(0);
    const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
    const [menuTx, setMenuTx] = useState<TransactionWithAccount | null>(null);

    const triggerRefetch = useCallback(() => setRefetchKey(key => key + 1), []);

    const mergedFilter: TransactionFilters = {
        ...headerFilter,
        ...(externalFilter ?? {}),
    };
    const filterKey = JSON.stringify(mergedFilter);

    useEffect(() => {
        let cancelled = false;

        const timer = setTimeout(() => {
            setLoading(true);
            const currentFilter: TransactionFilters = JSON.parse(filterKey);
            const hasFilter = Object.values(currentFilter).some(value => value !== undefined);

            transactionsApi
                .getTransactions({
                    page: paginationModel.page + 1,
                    limit: paginationModel.pageSize,
                    filter: hasFilter ? currentFilter : undefined,
                })
                .then(response => {
                    if (cancelled) return;
                    if (response.success) {
                        setTransactions(response.data.transactions);
                        setTotal(response.data.total);
                    }
                })
                .catch(error => {
                    if (!cancelled) console.error('Failed to fetch transactions:', error);
                })
                .finally(() => {
                    if (!cancelled) setLoading(false);
                });
        }, FETCH_DEBOUNCE_MS);

        return () => {
            cancelled = true;
            clearTimeout(timer);
        };
    }, [paginationModel.page, paginationModel.pageSize, filterKey, refetchKey]);

    const updateFilter = useCallback((patch: Partial<TransactionFilters>) => {
        setHeaderFilter(previous => {
            const next = { ...previous, ...patch };
            for (const key of Object.keys(next) as (keyof TransactionFilters)[]) {
                if (next[key] === undefined) delete next[key];
            }
            return next;
        });
        setPaginationModel(model => ({ ...model, page: 0 }));
    }, []);

    const closeMenu = () => {
        setMenuAnchor(null);
        setMenuTx(null);
    };

    const formatDate = (date: string) => {
        const [datePart] = date.split('T');
        const [year, month, day] = datePart.split('-');
        return `${month}-${day}-${year}`;
    };

    const formatAmount = (amount: number) =>
        new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);

    const columns = useMemo<GridColDef<TransactionWithAccount>[]>(() => [
        {
            field: 'actions',
            headerName: '',
            width: 44,
            sortable: false,
            filterable: false,
            disableColumnMenu: true,
            renderCell: ({ row }) => (
                <IconButton
                    size="small"
                    aria-label="Transaction actions"
                    onClick={event => {
                        setMenuAnchor(event.currentTarget);
                        setMenuTx(row);
                    }}
                >
                    <MoreVertIcon fontSize="small" />
                </IconButton>
            ),
        },
        {
            field: 'date',
            headerName: 'Date',
            width: 115,
            sortable: false,
            renderHeader: () => (
                <DateFilterHeader
                    dateFrom={headerFilter.dateFrom}
                    dateTo={headerFilter.dateTo}
                    onChange={(dateFrom, dateTo) => updateFilter({ dateFrom, dateTo })}
                />
            ),
            valueFormatter: value => formatDate(String(value)),
        },
        {
            field: 'accountName',
            headerName: 'Account',
            width: 120,
            sortable: false,
            renderHeader: () => (
                <AccountFilterHeader
                    selectedAccountIds={headerFilter.accountIds ?? []}
                    onChange={accountIds =>
                        updateFilter({ accountIds: accountIds.length > 0 ? accountIds : undefined })
                    }
                />
            ),
            renderCell: ({ row }) => (
                <Link href="/accounts" color="inherit" underline="hover" noWrap>
                    {row.accountName}
                </Link>
            ),
        },
        {
            field: 'vendorLabel',
            headerName: 'Vendor',
            width: 160,
            sortable: false,
            renderHeader: () => (
                <VendorFilterHeader
                    vendors={headerFilter.vendors ?? []}
                    onChange={vendors => updateFilter({ vendors: vendors.length > 0 ? vendors : undefined })}
                />
            ),
            renderCell: ({ row }) => <VendorCell transaction={row} onVendorAssigned={triggerRefetch} />,
        },
        {
            field: 'description',
            headerName: 'Description',
            flex: 1,
            minWidth: 150,
            sortable: false,
            valueFormatter: value => value ?? '—',
        },
        {
            field: 'categoryName',
            headerName: 'Category',
            width: 170,
            sortable: false,
            renderHeader: () => (
                <CategoryFilterHeader
                    selectedCategoryIds={headerFilter.categoryIds ?? []}
                    onChange={categoryIds =>
                        updateFilter({ categoryIds: categoryIds.length > 0 ? categoryIds : undefined })
                    }
                />
            ),
            renderCell: ({ row }) => <CategoryCell transaction={row} onCategoryAssigned={triggerRefetch} />,
        },
        {
            field: 'amount',
            headerName: 'Amount',
            width: 130,
            type: 'number',
            sortable: false,
            renderHeader: () => (
                <AmountFilterHeader
                    amountMin={headerFilter.amountMin}
                    amountMax={headerFilter.amountMax}
                    onChange={(amountMin, amountMax) => updateFilter({ amountMin, amountMax })}
                />
            ),
            valueFormatter: value => formatAmount(Number(value)),
        },
    ], [headerFilter, triggerRefetch, updateFilter]);

    return (
        <Box sx={{ width: '100%' }}>
            <DataGrid
                rows={transactions}
                columns={columns}
                rowCount={total}
                loading={loading}
                pagination
                paginationMode="server"
                paginationModel={paginationModel}
                onPaginationModelChange={setPaginationModel}
                pageSizeOptions={[10, 25, 50, 100]}
                disableRowSelectionOnClick
                disableColumnSorting
                disableColumnFilter
                disableColumnMenu
                autoHeight
                rowHeight={40}
                columnHeaderHeight={44}
                localeText={{ noRowsLabel: 'No transactions found' }}
            />

            <Menu
                anchorEl={menuAnchor}
                open={Boolean(menuAnchor)}
                onClose={closeMenu}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
                transformOrigin={{ vertical: 'top', horizontal: 'left' }}
            >
                <MenuItem
                    disabled={!menuTx?.uploadRecordId}
                    component={menuTx?.uploadRecordId ? Link : 'li'}
                    href={menuTx?.uploadRecordId ? `/upload-record/${menuTx.uploadRecordId}` : undefined}
                    onClick={closeMenu}
                >
                    <ListItemText
                        primary="View Upload"
                        secondary={
                            menuTx?.uploadCreatedAt
                                ? new Date(menuTx.uploadCreatedAt).toLocaleDateString()
                                : 'No upload record'
                        }
                    />
                </MenuItem>
            </Menu>
        </Box>
    );
}