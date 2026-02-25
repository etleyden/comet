/**
 * Converts a Date or string value to an ISO 8601 string.
 * TypeORM can return date columns as either a Date object or a pre-serialised
 * string depending on the driver / transformer, so both cases are handled.
 */
export function toISOString(value: Date | string): string;
export function toISOString(value: Date | string | null | undefined): string | undefined;
export function toISOString(value: Date | string | null | undefined): string | undefined {
    if (value == null) return undefined;
    return value instanceof Date ? value.toISOString() : String(value);
}
