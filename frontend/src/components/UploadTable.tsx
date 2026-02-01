import { useMemo } from 'react';
import ArrowDropUpIcon from '@mui/icons-material/ArrowDropUp';
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';
import {
    useReactTable,
    getCoreRowModel,
    getSortedRowModel,
    getFilteredRowModel,
    getPaginationRowModel,
    flexRender,
    type SortingState,
    type ColumnDef,
} from '@tanstack/react-table';
import {
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Paper,
    TablePagination,
    TextField,
    Box,
} from '@mui/material';
import { useState } from 'react';

/**
 * This component is similar to the TransactionTable, 
 * except it will display all columns in a CSV, 
 * allowing users to label their columns appropriately.
 */

interface UploadTableProps {
    data: any[];
}

export default function UploadTable({ data }: UploadTableProps) {
    const [sorting, setSorting] = useState<SortingState>([]);
    const [globalFilter, setGlobalFilter] = useState('');
    const [pagination, setPagination] = useState({
        pageIndex: 0,
        pageSize: 25,
    });

    // Automatically infer columns from the data
    const columns = useMemo(() => {
        if (!data || data.length === 0) return [];
        return Object.keys(data[0]);
    }, [data]);

    // Create column definitions from the inferred column names
    const columnDefs = useMemo<ColumnDef<any>[]>(
        () =>
            columns.map((col) => ({
                accessorKey: col,
                header: col,
                cell: (info) => info.getValue(),
            })),
        [columns]
    );

    const table = useReactTable({
        data,
        columns: columnDefs,
        state: {
            sorting,
            globalFilter,
            pagination,
        },
        onSortingChange: setSorting,
        onGlobalFilterChange: setGlobalFilter,
        onPaginationChange: setPagination,
        getCoreRowModel: getCoreRowModel(),
        getSortedRowModel: getSortedRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
    });

    if(data.length === 0) {
        return <div>No data to display</div>;
    }

    return (
        <Box>
            <TextField
                label="Search all columns"
                variant="outlined"
                size="small"
                value={globalFilter ?? ''}
                onChange={(e) => setGlobalFilter(e.target.value)}
                sx={{ mb: 2, minWidth: 300 }}
            />
            <TableContainer component={Paper}>
                <Table>
                    <TableHead>
                        {table.getHeaderGroups().map((headerGroup) => (
                            <TableRow key={headerGroup.id}>
                                {headerGroup.headers.map((header) => (
                                    <TableCell
                                        key={header.id}
                                        onClick={header.column.getToggleSortingHandler()}
                                        sx={{ cursor: 'pointer', fontWeight: 'bold' }}
                                    ><Box sx={{ display: "flex", alignContent: "center" }}><Box>{{
                                        asc: <ArrowDropUpIcon fontSize="small" />,
                                        desc: <ArrowDropDownIcon fontSize="small" />,
                                    }[header.column.getIsSorted() as string] ?? null}</Box>
                                            <Box>{header.isPlaceholder
                                                ? null
                                                : flexRender(
                                                    header.column.columnDef.header,
                                                    header.getContext()
                                                )}</Box>
                                        </Box>
                                    </TableCell>
                                ))}
                            </TableRow>
                        ))}
                    </TableHead>
                    <TableBody>
                        {table.getRowModel().rows.map((row) => (
                            <TableRow key={row.id}>
                                {row.getVisibleCells().map((cell) => (
                                    <TableCell key={cell.id}>
                                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                    </TableCell>
                                ))}
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>
            <TablePagination
                component="div"
                count={table.getFilteredRowModel().rows.length}
                page={pagination.pageIndex}
                onPageChange={(_, page) =>
                    setPagination((prev) => ({ ...prev, pageIndex: page }))
                }
                rowsPerPage={pagination.pageSize}
                onRowsPerPageChange={(e) =>
                    setPagination((prev) => ({
                        ...prev,
                        pageSize: Number(e.target.value),
                        pageIndex: 0,
                    }))
                }
                rowsPerPageOptions={[5, 25, 50, 100]}
            />
        </Box>
    );
}