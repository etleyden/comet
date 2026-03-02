import { useMemo, useState } from "react";
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
import { MAPPING_ATTRIBUTES } from 'shared';

interface TransactionMappingTableProps {
    data: any[];
    onMappingChange?: (mappings: Record<string, string>) => void;
}

/**
 * Component that allows users to map CSV columns to application-level transaction attributes
 * and preview the mapped data in a table.
 */
export default function TransactionMappingTable({ data, onMappingChange }: TransactionMappingTableProps) {
    const [columnMappings, setColumnMappings] = useState<Record<string, string>>(
        Object.fromEntries(MAPPING_ATTRIBUTES.map((attr) => [attr, '']))
    );

    const [pagination, setPagination] = useState({
        pageIndex: 0,
        pageSize: 10,
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
        setColumnMappings((prev) => {
            const newMappings = {
                ...prev,
                [appAttribute]: csvColumn,
            };
            onMappingChange?.(newMappings);
            return newMappings;
        });
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
                <Box sx={{ display: "flex", flexDirection: "column", alignItems: "stretch", gap: 1, minWidth: 120 }}>
                    <Typography sx={{ fontWeight: "bold" }}>
                        {appAttribute.charAt(0).toUpperCase() + appAttribute.slice(1)}
                    </Typography>
                    <FormControl variant="standard" size="small" fullWidth>
                        <Select
                            value={csvColumn}
                            onChange={(e) => handleMappingChange(appAttribute, e.target.value)}
                            displayEmpty
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
        <Paper>
            <TableContainer>
                <Table size="small">
                    <TableHead>
                        {table.getHeaderGroups().map((headerGroup) => (
                            <TableRow key={headerGroup.id}>
                                {headerGroup.headers.map((header, _index) => (
                                    <TableCell
                                        key={header.id}
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
                            <TableRow
                                key={row.id}
                            >
                                {row.getVisibleCells().map((cell, index) => (
                                    <TableCell
                                        key={`${cell.id}`}
                                        sx={{
                                            ...(index < row.getVisibleCells().length - 1
                                                ? { borderRight: 1, borderColor: "divider" }
                                                : {}),
                                        }}
                                    >
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
                rowsPerPageOptions={[10, 25, 50, 100]}
            />)}
        </Paper>
    );
}