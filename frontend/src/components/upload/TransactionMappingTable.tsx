import { useEffect, useMemo, useState } from "react";
import {
    useReactTable,
    getCoreRowModel,
    getPaginationRowModel,
    flexRender,
    type ColumnDef,
} from "@tanstack/react-table";
import {
    Box,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Paper,
    TablePagination,
    FormControl,
    Select,
    MenuItem,
    Typography,
} from "@mui/material";

interface TransactionMappingTableProps {
    data: any[];
}

/**
 * Component that allows users to map CSV columns to application-level transaction attributes
 * and preview the mapped data in a table.
 */
export default function TransactionMappingTable({ data }: TransactionMappingTableProps) {
    const [columnMappings, setColumnMappings] = useState<Record<string, string>>({
        date: "",
        amount: "",
        description: "",
        vendor: "",
        category: "",
        status: "",
    });

    const [pagination, setPagination] = useState({
        pageIndex: 0,
        pageSize: 25,
    });

    // Extract available CSV columns from the data
    const csvColumns = useMemo(() => {
        if (!data || data.length === 0) return [];
        const allKeys = new Set<string>();
        data.forEach(row => {
            Object.keys(row).forEach(key => allKeys.add(key));
        });
        return Array.from(allKeys);
    }, [data]);

    // Handle mapping changes
    const handleMappingChange = (appAttribute: string, csvColumn: string) => {
        setColumnMappings((prev) => ({
            ...prev,
            [appAttribute]: csvColumn,
        }));
    };

    // Check if any columns are mapped
    const hasAnyMappings = useMemo(() => {
        return Object.values(columnMappings).some((mapping) => mapping !== "");
    }, [columnMappings]);

    // Create column definitions - always show all attributes
    const columnDefs = useMemo<ColumnDef<any>[]>(() => {
        return Object.entries(columnMappings).map(([appAttribute, csvColumn]) => ({
            accessorFn: (row) => (csvColumn ? row[csvColumn] : undefined),
            id: `${appAttribute}_${csvColumn || 'unmapped'}`,
            header: () => (
                <Box>
                    <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: "bold" }}>
                        {appAttribute.charAt(0).toUpperCase() + appAttribute.slice(1)}
                    </Typography>
                    <FormControl fullWidth size="small">
                        <Select
                            value={csvColumn}
                            onChange={(e) => handleMappingChange(appAttribute, e.target.value)}
                            displayEmpty
                            sx={{ minWidth: 150 }}
                        >
                            <MenuItem value="">
                                <em>Select column...</em>
                            </MenuItem>
                            {csvColumns.map((col) => (
                                <MenuItem key={col} value={col}>
                                    {col}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                </Box>
            ),
            cell: (info) => {
                // If no column is mapped, show empty cell
                if (!csvColumn) return "";
                return info.getValue();
            },
        }));
    }, [columnMappings, csvColumns]);

    const table = useReactTable({
        data: hasAnyMappings ? data : [],
        columns: columnDefs,
        state: {
            pagination,
        },
        onPaginationChange: setPagination,
        getCoreRowModel: getCoreRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
    });

    if (!data || data.length === 0) {
        return <Typography>No data to display</Typography>;
    }



    return (
        <Box>
            <Typography variant="h6" sx={{ mb: 2 }}>
                Map CSV Columns to Transaction Attributes
            </Typography>

            <TableContainer component={Paper}>
                <Table>
                    <TableHead>
                        {table.getHeaderGroups().map((headerGroup) => (
                            <TableRow key={headerGroup.id}>
                                {headerGroup.headers.map((header) => (
                                    <TableCell
                                        key={header.id}
                                        sx={{ verticalAlign: "top", minWidth: 180 }}
                                    >
                                        {flexRender(
                                            header.column.columnDef.header,
                                            header.getContext()
                                        )}
                                    </TableCell>
                                ))}
                            </TableRow>
                        ))}
                    </TableHead>
                    <TableBody>
                        {table.getRowModel().rows.map((row) => (
                            <TableRow key={row.id}>
                                {row.getVisibleCells().map((cell) => (
                                    <TableCell key={`${cell.id}`}>
                                        {flexRender(
                                            cell.column.columnDef.cell,
                                            cell.getContext()
                                        )}
                                    </TableCell>
                                ))}
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>
            {hasAnyMappings && (<TablePagination
                component="div"
                count={hasAnyMappings ? data.length : 0}
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
            />)}
        </Box>
    );
}