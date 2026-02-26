/**
 * Validates that every non-empty value in `mapping` is present in `availableColumns`.
 * Returns an array of invalid column names (empty array if all are valid).
 */
export function validateMappingColumns(
    mapping: Record<string, string>,
    availableColumns: string[],
): string[] {
    const columnSet = new Set(availableColumns);
    return Object.values(mapping).filter((col) => col && !columnSet.has(col));
}
